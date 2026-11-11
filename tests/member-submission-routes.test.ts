import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  admin: vi.fn(),
  reserve: vi.fn(),
  finalize: vi.fn(),
  cancel: vi.fn(),
  proof: vi.fn(),
  review: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("../src/lib/member-auth", () => ({
  requireMemberAccount: mocks.account,
  MemberAuthError: class extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));
vi.mock("../src/lib/mission-admin-auth", () => ({
  hasMissionAdminAccess: mocks.admin,
}));
vi.mock("../src/lib/member-mission-store", () => ({
  reserveSubmission: mocks.reserve,
  finalizeSubmission: mocks.finalize,
  cancelSubmission: mocks.cancel,
  getProofUrl: mocks.proof,
  reviewSubmission: mocks.review,
  MemberMissionError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { MemberAuthError } from "../src/lib/member-auth";
import { MemberMissionError } from "../src/lib/member-mission-store";
import { POST as reserve } from "../src/app/api/member/submissions/route";
import { POST as finalize } from "../src/app/api/member/submissions/[id]/complete/route";
import { POST as cancel } from "../src/app/api/member/submissions/[id]/cancel/route";
import { GET as proof } from "../src/app/api/member/submissions/[id]/proof/route";
import { decideSubmission } from "../src/app/mission-admin/submissions/actions";

const memberId = "40000000-0000-4000-8000-000000000001";
const missionId = "40000000-0000-4000-8000-000000000002";
const submissionId = "40000000-0000-4000-8000-000000000003";
const context = { params: Promise.resolve({ id: submissionId }) };
const valid = { missionId, mime: "image/jpeg", size: 256 };
function request(body: unknown, origin = "https://playchambana.com") {
  return new Request("https://playchambana.com/api/member/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
function decision(value = "approve", reason = "") {
  const form = new FormData();
  form.set("id", submissionId);
  form.set("decision", value);
  form.set("reason", reason);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.account.mockResolvedValue({
    id: memberId,
    email: "test@illinois.edu",
    profile: { name: "Test", handle: "tester", interests: [] },
  });
  mocks.admin.mockResolvedValue(false);
  mocks.reserve.mockResolvedValue({
    submission: { id: submissionId },
    upload: {
      signedUrl: "https://example.supabase.co/signed",
      path: "private",
      token: "token",
    },
  });
  mocks.finalize.mockResolvedValue({ id: submissionId, status: "pending" });
  mocks.proof.mockResolvedValue("https://example.supabase.co/proof");
  mocks.review.mockResolvedValue({
    id: submissionId,
    status: "approved",
    nuts: 25,
  });
});

describe("member proof HTTP boundaries", () => {
  it("requires a real account before reserving an upload", async () => {
    mocks.account.mockRejectedValue(new MemberAuthError("Sign in first.", 401));
    const response = await reserve(request(valid));
    expect(response.status).toBe(401);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("uses the verified member identity and keeps signed URLs private", async () => {
    const response = await reserve(request(valid));
    expect(response.status).toBe(201);
    expect(mocks.account).toHaveBeenCalledWith({ profile: true });
    expect(mocks.reserve).toHaveBeenCalledWith(
      memberId,
      missionId,
      "image/jpeg",
      256,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
  });

  it.each([
    { ...valid, userId: "another-member" },
    { ...valid, nuts: 999 },
    { ...valid, proof_path: "someone-elses-proof" },
    { ...valid, missionId: "not-an-id" },
    { ...valid, mime: "image/svg+xml" },
    { ...valid, size: 0 },
    { ...valid, size: 10 * 1024 * 1024 + 1 },
    { ...valid, mime: "video/mp4", size: 50 * 1024 * 1024 + 1 },
  ])("rejects forged or unsupported upload metadata: %j", async (input) => {
    expect((await reserve(request(input))).status).toBe(400);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("accepts video proof within its separate upload limit", async () => {
    expect(
      (
        await reserve(
          request({
            ...valid,
            mime: "video/quicktime",
            size: 30 * 1024 * 1024,
          }),
        )
      ).status,
    ).toBe(201);
    expect(mocks.reserve).toHaveBeenCalledWith(
      memberId,
      missionId,
      "video/quicktime",
      30 * 1024 * 1024,
    );
  });

  it("rejects cross-site requests and missing origin", async () => {
    expect(
      (await reserve(request(valid, "https://attacker.example"))).status,
    ).toBe(403);
    const missingOrigin = request(valid);
    missingOrigin.headers.delete("origin");
    expect((await reserve(missingOrigin)).status).toBe(403);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("bounds request size even without a Content-Length header", async () => {
    expect(
      (await reserve(request({ ...valid, extra: "a".repeat(5000) }))).status,
    ).toBe(413);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without leaking internal errors", async () => {
    const bad = new Request("https://playchambana.com/api/member/submissions", {
      method: "POST",
      headers: {
        Origin: "https://playchambana.com",
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect((await reserve(bad)).status).toBe(400);
    mocks.reserve.mockRejectedValue(
      new Error("private service credential details"),
    );
    const response = await reserve(request(valid));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("credential");
  });

  it("finalizes only a server-owned proof reference and never accepts client approval", async () => {
    expect((await finalize(request({}), context)).status).toBe(200);
    expect(mocks.finalize).toHaveBeenCalledWith(memberId, submissionId);
    mocks.finalize.mockClear();
    expect(
      (await finalize(request({ status: "approved", nuts: 999 }), context))
        .status,
    ).toBe(400);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("propagates rejected ownership and stale proof as a safe error", async () => {
    mocks.finalize.mockRejectedValue(
      new MemberMissionError(404, "Submission not found"),
    );
    expect((await finalize(request({}), context)).status).toBe(404);
    expect(mocks.finalize).toHaveBeenCalledWith(memberId, submissionId);
  });

  it("cancels only through the verified member identity", async () => {
    expect((await cancel(request({}), context)).status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith(memberId, submissionId);
  });

  it("loads member proof with the server-owned identity", async () => {
    const response = await proof(
      new Request("https://playchambana.com/proof"),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.proof).toHaveBeenCalledWith(memberId, submissionId);
  });

  it("allows the separately authenticated owner to view submitted proof", async () => {
    mocks.admin.mockResolvedValue(true);
    expect(
      (await proof(new Request("https://playchambana.com/proof"), context))
        .status,
    ).toBe(200);
    expect(mocks.account).not.toHaveBeenCalled();
    expect(mocks.proof).toHaveBeenCalledWith(null, submissionId);
  });
});

describe("owner review actions", () => {
  it("requires owner access for each decision", async () => {
    expect(await decideSubmission({}, decision())).toHaveProperty("error");
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("passes only identity and decision to the atomic award operation", async () => {
    mocks.admin.mockResolvedValue(true);
    const form = decision();
    form.set("nuts", "1000000");
    expect(await decideSubmission({}, form)).toMatchObject({
      submission: { nuts: 25 },
    });
    expect(mocks.review).toHaveBeenCalledWith(submissionId, "approve", "");
    expect(mocks.revalidate).toHaveBeenCalledWith("/app");
  });

  it("requires a useful rejection reason", async () => {
    mocks.admin.mockResolvedValue(true);
    expect(await decideSubmission({}, decision("reject", "  "))).toHaveProperty(
      "error",
    );
    expect(mocks.review).not.toHaveBeenCalled();
    await decideSubmission({}, decision("reject", "Please show the sign."));
    expect(mocks.review).toHaveBeenCalledWith(
      submissionId,
      "reject",
      "Please show the sign.",
    );
  });

  it("does not show success when a conflicting stale review is refused", async () => {
    mocks.admin.mockResolvedValue(true);
    mocks.review.mockRejectedValue(
      new MemberMissionError(
        409,
        "This submission has already changed. Refresh the queue",
      ),
    );
    const result = await decideSubmission({}, decision());
    expect(result).toEqual({
      error: "This submission has already changed. Refresh the queue",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
