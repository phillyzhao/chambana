import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  member: vi.fn(),
  admin: vi.fn(),
  isAdmin: vi.fn(),
  service: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("../src/lib/member-auth", () => ({
  requireMemberAccount: mocks.member,
}));
vi.mock("../src/lib/mission-admin-auth", () => ({
  requireMissionAdminAccess: mocks.admin,
  hasMissionAdminAccess: mocks.isAdmin,
}));
vi.mock("../src/lib/supabase", () => ({ serviceDatabase: mocks.service }));
import {
  finalizeSubmission,
  getMemberMissionState,
  getProofUrl,
  listReviewSubmissions,
  reserveSubmission,
  reviewSubmission,
} from "../src/lib/member-mission-store";
import {
  PHOTO_LIMIT,
  VIDEO_LIMIT,
  proofHeaderMatches,
  proofUploadSchema,
} from "../src/lib/member-missions";

const userId = "10000000-0000-4000-8000-000000000001";
const missionId = "20000000-0000-4000-8000-000000000001";
const id = "30000000-0000-4000-8000-000000000001";
const submission = {
  id,
  user_id: userId,
  mission_id: missionId,
  status: "uploading",
  nuts: 35,
  proof_path: `${userId}/${id}/proof`,
  mime_type: "image/jpeg",
  size_bytes: 24,
  created_at: "2026-11-11T12:00:00Z",
  submitted_at: null,
};

function query(data: unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } =
    {};
  for (const method of ["select", "eq", "neq", "in", "not", "order", "limit"])
    builder[method] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return builder;
}
function database(data: unknown = submission) {
  const builder = query(data);
  const storage = {
    createSignedUploadUrl: vi.fn().mockResolvedValue({
      data: {
        signedUrl: "https://test.supabase.co/storage/v1/upload/signed",
        path: submission.proof_path,
        token: "signed-token",
      },
      error: null,
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: {
        signedUrl:
          "https://test.supabase.co/storage/v1/object/sign/member-mission-proof/proof?token=test",
      },
      error: null,
    }),
  };
  const db = {
    from: vi.fn(() => builder),
    rpc: vi.fn().mockResolvedValue({ data: submission, error: null }),
    storage: { from: vi.fn(() => storage) },
  };
  mocks.service.mockReturnValue(db);
  return { db, builder, storage };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", "true");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.member.mockResolvedValue({ id: userId, profile: { name: "Member" } });
  mocks.admin.mockResolvedValue(undefined);
  mocks.isAdmin.mockResolvedValue(false);
  mocks.fetch.mockResolvedValue(
    new Response(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), { status: 206 }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("private proof service boundaries", () => {
  it("respects the mission delivery switch before reserving an upload", async () => {
    const { db } = database();
    vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", "false");
    await expect(
      reserveSubmission(userId, missionId, "image/jpeg", 24),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("never trusts a supplied member ID", async () => {
    const { db } = database();
    await expect(
      reserveSubmission("someone-else", missionId, "image/jpeg", 24),
    ).rejects.toMatchObject({ status: 403 });
    await expect(getMemberMissionState("someone-else")).rejects.toMatchObject({
      status: 403,
    });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  });

  it("requests immutable signed uploads only at the reserved server path", async () => {
    const { db, storage } = database();
    const result = await reserveSubmission(userId, missionId, "image/jpeg", 24);
    expect(db.rpc).toHaveBeenCalledWith("reserve_member_submission", {
      p_user_id: userId,
      p_mission_id: missionId,
      p_mime_type: "image/jpeg",
      p_size_bytes: 24,
    });
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
      submission.proof_path,
      { upsert: false },
    );
    expect(result.submission.id).toBe(id);
    expect(result.upload.token).toBe("signed-token");
  });

  it("checks file bytes before allowing pending review and requests a bounded range", async () => {
    const { db, builder } = database();
    await finalizeSubmission(userId, id);
    expect(builder.eq.mock.calls).toContainEqual(["user_id", userId]);
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://test.supabase.co/"),
      expect.objectContaining({
        headers: { Range: "bytes=0-4095" },
        redirect: "error",
        cache: "no-store",
      }),
    );
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith(
      "finalize_member_submission",
      { p_user_id: userId, p_submission_id: id },
    );
  });

  it("rejects a disguised document without finalizing it", async () => {
    const { db } = database();
    mocks.fetch.mockResolvedValue(
      new Response("<html>not a photo</html>", { status: 206 }),
    );
    await expect(finalizeSubmission(userId, id)).rejects.toMatchObject({
      status: 422,
    });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("does not refinalize an already submitted attempt", async () => {
    const { db } = database({
      ...submission,
      status: "pending",
      submitted_at: "2026-11-11T12:01:00Z",
    });
    await expect(finalizeSubmission(userId, id)).resolves.toMatchObject({
      status: "pending",
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("will not fetch a signed URL outside the configured storage origin", async () => {
    const { db, storage } = database();
    storage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://outside.example/proof" },
      error: null,
    });
    await expect(finalizeSubmission(userId, id)).rejects.toMatchObject({
      status: 503,
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("does not disclose proof to unsigned visitors or wrong members", async () => {
    const { builder, storage } = database(null);
    await expect(getProofUrl(null, id)).rejects.toMatchObject({ status: 401 });
    await expect(getProofUrl(userId, id)).rejects.toMatchObject({
      status: 404,
    });
    expect(builder.eq.mock.calls).toContainEqual(["user_id", userId]);
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("allows the owner to review private proof with an expiring URL", async () => {
    const { storage } = database({
      ...submission,
      status: "pending",
      submitted_at: "2026-11-11T12:01:00Z",
    });
    mocks.isAdmin.mockResolvedValue(true);
    await expect(getProofUrl(null, id)).resolves.toContain("/object/sign/");
    expect(storage.createSignedUrl).toHaveBeenCalledWith(
      submission.proof_path,
      300,
    );
  });

  it("requires the owner guard again inside listing and decision functions", async () => {
    const { db } = database();
    mocks.admin.mockRejectedValue(
      new Error("Sign in to mission administration"),
    );
    await expect(listReviewSubmissions()).rejects.toThrow("Sign in");
    await expect(reviewSubmission(id, "approve")).rejects.toThrow("Sign in");
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("cannot approve by choosing a reward value and reports conflicts safely", async () => {
    const { db } = database();
    await reviewSubmission(id, "approve");
    expect(db.rpc).toHaveBeenCalledWith("review_member_submission", {
      p_submission_id: id,
      p_decision: "approve",
      p_reason: "",
    });
    db.rpc.mockResolvedValue({
      data: null,
      error: {
        message: "This submission has already changed. Refresh the queue",
      },
    });
    await expect(
      reviewSubmission(id, "reject", "Try again"),
    ).rejects.toMatchObject({ status: 409 });
    db.rpc.mockResolvedValue({
      data: null,
      error: { message: "internal database private details" },
    });
    await expect(reviewSubmission(id, "approve")).rejects.toMatchObject({
      status: 503,
      message:
        "Your mission activity is temporarily unavailable. Please try again.",
    });
  });
});

describe("photo and video proof validation", () => {
  it("recognizes photos and supported video containers rather than MIME alone", () => {
    expect(
      proofHeaderMatches(
        Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
        "image/png",
      ),
    ).toBe(true);
    expect(
      proofHeaderMatches(
        new TextEncoder().encode("RIFF0000WEBP"),
        "image/webp",
      ),
    ).toBe(true);
    const mp4 = Uint8Array.from([
      0,
      0,
      0,
      24,
      ...new TextEncoder().encode("ftypisom0000isommp42"),
    ]);
    expect(proofHeaderMatches(mp4, "video/mp4")).toBe(true);
    expect(proofHeaderMatches(mp4, "video/quicktime")).toBe(false);
    const mov = Uint8Array.from([
      0,
      0,
      0,
      20,
      ...new TextEncoder().encode("ftypqt  0000qt  "),
    ]);
    expect(proofHeaderMatches(mov, "video/quicktime")).toBe(true);
    expect(
      proofHeaderMatches(
        Uint8Array.from([
          0x1a,
          0x45,
          0xdf,
          0xa3,
          ...new TextEncoder().encode("webm"),
        ]),
        "video/webm",
      ),
    ).toBe(true);
    expect(
      proofHeaderMatches(new TextEncoder().encode("image/jpeg"), "image/jpeg"),
    ).toBe(false);
  });
  it("applies the smaller photo limit and rejects empty or unsupported uploads", () => {
    expect(
      proofUploadSchema.safeParse({
        missionId,
        mime: "image/jpeg",
        size: PHOTO_LIMIT,
      }).success,
    ).toBe(true);
    expect(
      proofUploadSchema.safeParse({
        missionId,
        mime: "image/jpeg",
        size: PHOTO_LIMIT + 1,
      }).success,
    ).toBe(false);
    expect(
      proofUploadSchema.safeParse({
        missionId,
        mime: "video/mp4",
        size: VIDEO_LIMIT,
      }).success,
    ).toBe(true);
    expect(
      proofUploadSchema.safeParse({
        missionId,
        mime: "video/mp4",
        size: VIDEO_LIMIT + 1,
      }).success,
    ).toBe(false);
    expect(
      proofUploadSchema.safeParse({ missionId, mime: "image/jpeg", size: 0 })
        .success,
    ).toBe(false);
    expect(
      proofUploadSchema.safeParse({ missionId, mime: "text/html", size: 10 })
        .success,
    ).toBe(false);
  });
});
