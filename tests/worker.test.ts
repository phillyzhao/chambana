import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ serviceDatabase: state.db }));
import { verifySubmission } from "../src/lib/verification";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "fixture-key");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function fixture(manual = false, claimed = true) {
  const rpc = vi.fn(async (name: string) =>
    name === "claim_submission"
      ? {
          data: claimed
            ? [
                {
                  storage_path: "fixture.jpg",
                  assignment_id: "assignment",
                  lease_token: "lease",
                },
              ]
            : [],
          error: null,
        }
      : { data: "needs_review", error: null },
  );
  const db = {
    rpc,
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob(["fixture"]), error: null }),
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              title: "Fixture",
              proof_criteria: "A squirrel",
              manual_review: manual,
            },
            error: null,
          }),
        }),
      }),
    }),
  };
  state.db.mockReturnValue(db);
  return rpc;
}
it("manual-only proof never reaches Google and settles for human review", async () => {
  const rpc = fixture(true),
    fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await verifySubmission("submission");
  expect(fetcher).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenLastCalledWith(
    "settle_submission",
    expect.objectContaining({ p_decision: "needs_review", p_lease: "lease" }),
  );
});
it.each([429, 503])(
  "provider HTTP %s safely routes saved proof to human review",
  async (status) => {
    const rpc = fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("private upstream details", { status })),
    );
    await verifySubmission("submission");
    expect(rpc).toHaveBeenLastCalledWith(
      "settle_submission",
      expect.objectContaining({
        p_decision: "needs_review",
        p_reason: expect.not.stringContaining("private upstream"),
      }),
    );
  },
);
it("a worker without a lease does nothing", async () => {
  const rpc = fixture(false, false),
    fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await verifySubmission("submission");
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(fetcher).not.toHaveBeenCalled();
});
