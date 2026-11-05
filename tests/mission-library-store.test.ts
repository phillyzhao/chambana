import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn() }));
vi.mock("../src/lib/mission-admin-auth", () => ({
  requireMissionAdminAccess: mocks.auth,
}));
vi.mock("../src/lib/supabase", () => ({ serviceDatabase: mocks.service }));
import {
  importMissionDraftRecords,
  listAdminMissions,
  listPublishedMissions,
  renameMissionTitle,
  saveMissionDraft,
} from "../src/lib/mission-library-store";
import { missionDraftSchema } from "../src/lib/mission-library";

function queryResult(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    order: vi.fn(),
    not: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    upsert: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (result: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  for (const method of [
    builder.select,
    builder.order,
    builder.not,
    builder.is,
    builder.or,
    builder.update,
    builder.insert,
    builder.eq,
    builder.upsert,
  ])
    method.mockReturnValue(builder);
  const from = vi.fn().mockReturnValue(builder);
  mocks.service.mockReturnValue({ from });
  return { ...builder, from };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(undefined);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
});

describe("title-only mission persistence", () => {
  const id = "30000000-0000-4000-8000-000000000001";

  it("updates only the title and approval, preserving the schedule, archive, and other content", async () => {
    const returned = { id, title: "New title", revision: 5, approved_at: null };
    const query = queryResult({
      data: { ...returned, private_extra: "must not return" },
      error: null,
    });
    expect(await renameMissionTitle(id, 4, "  New title  ")).toEqual(returned);
    expect(query.update).toHaveBeenCalledExactlyOnceWith({
      title: "New title",
      approved_at: null,
    });
    expect(query.eq.mock.calls).toEqual([
      ["id", id],
      ["revision", 4],
    ]);
    expect(query.select).toHaveBeenCalledExactlyOnceWith(
      "id,title,revision,approved_at",
    );
    expect(query.insert).not.toHaveBeenCalled();
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it("cannot restore approval when an unchanged title is submitted", async () => {
    const query = queryResult({
      data: { id, title: "Same title", revision: 6, approved_at: null },
      error: null,
    });
    await renameMissionTitle(id, 5, "Same title");
    expect(query.update).toHaveBeenCalledExactlyOnceWith({
      title: "Same title",
      approved_at: null,
    });
  });

  it("rechecks owner authorization inside the store", async () => {
    mocks.auth.mockRejectedValueOnce(
      new Error("Sign in to mission administration to continue."),
    );
    await expect(renameMissionTitle(id, 4, "New title")).rejects.toThrow(
      "Sign in",
    );
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "abc", "x".repeat(121)])(
    "validates titles before accessing the database (%s)",
    async (title) => {
      await expect(renameMissionTitle(id, 4, title)).rejects.toThrow();
      expect(mocks.service).not.toHaveBeenCalled();
    },
  );

  it("validates the identity and revision inside the store", async () => {
    await expect(
      renameMissionTitle("wrong-id", 4, "New title"),
    ).rejects.toThrow();
    await expect(renameMissionTitle(id, 0, "New title")).rejects.toThrow();
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("treats no matching revision as a conflict without an insert fallback", async () => {
    const query = queryResult({ data: null, error: null });
    await expect(renameMissionTitle(id, 4, "New title")).rejects.toThrow(
      "changed in another window",
    );
    expect(query.insert).not.toHaveBeenCalled();
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it("turns raw database errors into a safe operational message", async () => {
    queryResult({
      data: null,
      error: { message: "private key and database internals" },
    });
    await expect(renameMissionTitle(id, 4, "New title")).rejects.toThrow(
      "The mission library is unavailable.",
    );
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("mission library persistence", () => {
  it("uses a stable ID order when starter missions share a creation timestamp", async () => {
    const query = queryResult({ data: [], error: null });
    expect(await listAdminMissions()).toEqual({ missions: [] });
    expect(query.order.mock.calls).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
  });

  it("validates all 25 starter drafts and never overwrites them on a repeated import", async () => {
    const query = queryResult({ data: [], error: null });
    expect(await importMissionDraftRecords()).toBe(0);
    const [rows, options] = query.upsert.mock.calls[0];
    expect(rows).toHaveLength(25);
    expect(new Set(rows.map((row: { id: string }) => row.id)).size).toBe(25);
    expect(options).toEqual({ onConflict: "id", ignoreDuplicates: true });
    for (const row of rows) {
      expect(row).toMatchObject({
        approved_at: null,
        archived_at: null,
        starts_at: null,
        ends_at: null,
      });
    }
  });
  it("clears approval on every save and uses the exact editor revision", async () => {
    const seed = JSON.parse(
      await readFile(
        new URL("../data/mission-library-seed.json", import.meta.url),
        "utf8",
      ),
    )[0];
    const query = queryResult({ data: { id: seed.id }, error: null });
    expect(
      await saveMissionDraft(missionDraftSchema.parse(seed), seed.id, 9),
    ).toBe(seed.id);
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ approved_at: null, archived_at: null }),
    );
    expect(query.eq).toHaveBeenCalledWith("revision", 9);
  });
  it("rechecks authorization before loading private drafts", async () => {
    mocks.auth.mockRejectedValueOnce(
      new Error("Sign in to mission administration to continue."),
    );
    await expect(listAdminMissions()).rejects.toThrow("Sign in");
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("never returns draft or future rows even if a backend response includes them", async () => {
    const approved = {
      id: "approved",
      approved_at: "2026-01-01T00:00:00Z",
      archived_at: null,
      starts_at: null,
      ends_at: null,
    };
    const query = queryResult({
      data: [
        approved,
        { ...approved, id: "draft", approved_at: null },
        { ...approved, id: "future", starts_at: "2099-01-01T00:00:00Z" },
      ],
      error: null,
    });
    expect(await listPublishedMissions()).toEqual({ missions: [approved] });
    expect(query.not).toHaveBeenCalledWith("approved_at", "is", null);
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(query.or).toHaveBeenCalledTimes(2);
  });
  it("returns an honest empty error state without leaking backend errors or loading seed fallback", async () => {
    queryResult({
      data: null,
      error: { message: "private service error contains secret" },
    });
    const result = await listPublishedMissions();
    expect(result.missions).toEqual([]);
    expect(result.error).toContain("temporarily unavailable");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
