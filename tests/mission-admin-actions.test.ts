import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  configured: vi.fn(),
  save: vi.fn(),
  rename: vi.fn(),
  approve: vi.fn(),
  archive: vi.fn(),
  seed: vi.fn(),
  revalidate: vi.fn(),
  cookies: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("../src/lib/mission-admin-auth", () => ({
  hasMissionAdminAccess: mocks.access,
  missionAdminConfigured: mocks.configured,
}));
vi.mock("../src/lib/mission-library-store", () => ({
  saveMissionDraft: mocks.save,
  renameMissionTitle: mocks.rename,
  approveMissionRecord: mocks.approve,
  archiveMissionRecord: mocks.archive,
  importMissionDraftRecords: mocks.seed,
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import {
  approveMission,
  archiveMission,
  importMissionDrafts,
  loginMissionAdmin,
  renameMission,
  saveMission,
} from "../src/app/mission-admin/actions";
const id = "30000000-0000-4000-8000-000000000001";
function reference() {
  const form = new FormData();
  form.set("id", id);
  form.set("revision", "3");
  return form;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue(true);
});

describe("mission admin mutation boundaries", () => {
  it("does not let failed attempts lock out a correct owner key", async () => {
    const key = "test-owner-key-longer-than-thirty-two-characters";
    vi.stubEnv("MISSION_ADMIN_SECRET", key);
    mocks.configured.mockReturnValue(true);
    const cookie = vi.fn();
    mocks.cookies.mockResolvedValue({ set: cookie });
    const form = new FormData();
    form.set("secret", "wrong");
    try {
      for (let i = 0; i < 21; i++) await loginMissionAdmin({}, form);
      expect(await loginMissionAdmin({}, form)).toMatchObject({
        error: expect.stringMatching(/Too many/),
      });
      form.set("secret", key);
      mocks.redirect.mockImplementationOnce(() => {
        throw new Error("REDIRECT");
      });
      await expect(loginMissionAdmin({}, form)).rejects.toThrow("REDIRECT");
      expect(cookie).toHaveBeenCalledWith(
        "chambana_mission_admin",
        expect.any(String),
        expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("rechecks owner access for every mutation before touching storage", async () => {
    mocks.access.mockResolvedValue(false);
    for (const action of [
      saveMission,
      renameMission,
      approveMission,
      archiveMission,
      importMissionDrafts,
    ]) {
      expect(await action({}, reference())).toMatchObject({
        error: expect.stringMatching(/Sign in/),
      });
    }
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.rename).not.toHaveBeenCalled();
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.archive).not.toHaveBeenCalled();
    expect(mocks.seed).not.toHaveBeenCalled();
  });
  it("requires a separate explicit approval confirmation", async () => {
    const form = reference();
    expect(await approveMission({}, form)).toHaveProperty("error");
    expect(mocks.approve).not.toHaveBeenCalled();
    form.set("confirmation", "APPROVE");
    expect(await approveMission({}, form)).toHaveProperty("success");
    expect(mocks.approve).toHaveBeenCalledWith(id, 3);
  });
  it("rejects forged references and missing revisions", async () => {
    const form = reference();
    form.set("confirmation", "APPROVE");
    form.delete("revision");
    expect(await approveMission({}, form)).toHaveProperty("error");
    form.set("revision", "3");
    form.set("id", "not-a-uuid");
    expect(await archiveMission({}, form)).toHaveProperty("error");
    expect(mocks.archive).not.toHaveBeenCalled();
    expect(mocks.approve).not.toHaveBeenCalled();
  });
  it("does not expose database/network details to the client", async () => {
    const form = reference();
    form.set("confirmation", "APPROVE");
    mocks.approve.mockRejectedValueOnce(
      new Error("https://secret-service-key@private-host"),
    );
    const result = await approveMission({}, form);
    expect(result.error).not.toContain("secret-service-key");
    expect(result.error).toContain("could not be saved");
  });
  it("reports an idempotent seed retry without claiming new drafts were added", async () => {
    mocks.seed.mockResolvedValueOnce(0);
    expect(await importMissionDrafts({}, new FormData())).toMatchObject({
      success: expect.stringMatching(/already.*preserved/),
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/design-preview");
  });
});

describe("inline mission title edits", () => {
  it("trims the title, returns the synchronized revision, and refreshes both routes", async () => {
    const form = reference();
    form.set("title", "  Quad victory lap  ");
    // Fields from the full editor must not be forwarded by this narrow action.
    form.set("starts_at", "2099-01-01T00:00:00Z");
    form.set("approved_at", "2026-10-31T00:00:00Z");
    const mission = {
      id,
      title: "Quad victory lap",
      revision: 4,
      approved_at: null,
    };
    mocks.rename.mockResolvedValueOnce(mission);
    const result = await renameMission({}, form);
    expect(mocks.rename).toHaveBeenCalledWith(id, 3, "Quad victory lap");
    expect(result).toMatchObject({
      id,
      mission,
      success: expect.stringContaining("Title saved"),
    });
    expect(mocks.revalidate.mock.calls).toEqual([
      ["/mission-admin"],
      ["/design-preview"],
    ]);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.approve).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "abc", "x".repeat(121), null])(
    "rejects an invalid title before storage (%s)",
    async (title) => {
      const form = reference();
      if (title !== null) form.set("title", title);
      expect(await renameMission({}, form)).toMatchObject({
        error: expect.stringContaining("4 and 120"),
      });
      expect(mocks.rename).not.toHaveBeenCalled();
      expect(mocks.revalidate).not.toHaveBeenCalled();
    },
  );

  it("rejects a file instead of a text title", async () => {
    const form = reference();
    form.set("title", new File(["Valid title"], "title.txt"));
    expect(await renameMission({}, form)).toHaveProperty("error");
    expect(mocks.rename).not.toHaveBeenCalled();
  });

  it.each([
    { id: "not-a-uuid", revision: "3" },
    { id, revision: "" },
    { id, revision: "0" },
    { id, revision: "1.5" },
  ])("rejects an invalid reference %#", async (values) => {
    const form = new FormData();
    form.set("id", values.id);
    form.set("revision", values.revision);
    form.set("title", "Valid title");
    expect(await renameMission({}, form)).toMatchObject({
      error: expect.stringContaining("reference is invalid"),
    });
    expect(mocks.rename).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("refreshes saved data on conflict without claiming success or retrying", async () => {
    const form = reference();
    form.set("title", "Valid title");
    mocks.rename.mockRejectedValueOnce(
      new Error(
        "This mission changed in another window. Refresh the page before trying again.",
      ),
    );
    expect(await renameMission({}, form)).toEqual({
      error:
        "This mission changed in another window. Refresh the page before trying again.",
    });
    expect(mocks.revalidate.mock.calls).toEqual([
      ["/mission-admin"],
      ["/design-preview"],
    ]);
    expect(mocks.rename).toHaveBeenCalledExactlyOnceWith(id, 3, "Valid title");
  });

  it("redacts unexpected storage errors and returns no stale mission patch", async () => {
    const form = reference();
    form.set("title", "Valid title");
    mocks.rename.mockRejectedValueOnce(
      new Error("database secret-service-key at private-host"),
    );
    const result = await renameMission(
      { mission: { id, title: "Old title", revision: 2, approved_at: null } },
      form,
    );
    expect(result).toEqual({
      error: "The change could not be saved. Please try again.",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
