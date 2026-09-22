import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), verify: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ serviceDatabase: mocks.db }));
vi.mock("../src/lib/verification", () => ({ verifySubmission: mocks.verify }));
import { GET } from "../src/app/api/cron/verify/route";
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());
describe("queue endpoint authentication", () => {
  it("fails closed when no cron secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(
      (await GET(new Request("http://localhost/api/cron/verify"))).status,
    ).toBe(401);
  });
  it.each(["", "Bearer wrong", "Bearer sécret"])(
    "rejects malformed credentials: %s",
    async (authorization) => {
      vi.stubEnv("CRON_SECRET", "secret");
      expect(
        (
          await GET(
            new Request("http://localhost/api/cron/verify", {
              headers: { authorization },
            }),
          )
        ).status,
      ).toBe(401);
    },
  );
});

describe("queue processing", () => {
  const request = () =>
    new Request("http://localhost/api/cron/verify", {
      headers: { authorization: "Bearer secret" },
    });
  function database(queueError = false) {
    const chain: Record<string, any> = {};
    chain.update = vi.fn(() => ({ or: vi.fn(async () => ({ error: null })) }));
    chain.select = chain.or = chain.lt = chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(async () => ({
      data: [{ id: "one" }, { id: "two" }],
      error: queueError ? {} : null,
    }));
    const cleanup = { delete: () => ({ lt: async () => ({ error: null }) }) };
    mocks.db.mockReturnValue({
      from: (table: string) => (table === "request_limits" ? cleanup : chain),
    });
    vi.stubEnv("CRON_SECRET", "secret");
    return chain;
  }
  it("processes a bounded batch and prevents caching", async () => {
    const chain = database();
    mocks.verify.mockResolvedValue(undefined);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ processed: 2, failed: 0 });
    expect(chain.limit).toHaveBeenCalledWith(2);
  });
  it("reports worker failures to the scheduler", async () => {
    database();
    mocks.verify.mockRejectedValue(new Error("fixture"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ processed: 0, failed: 2 });
  });
  it("does not call workers when the queue cannot be read", async () => {
    database(true);
    expect((await GET(request())).status).toBe(503);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("does not leak database exceptions", async () => {
    database();
    mocks.db.mockImplementation(() => {
      throw new Error("private connection details");
    });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Queue unavailable" });
  });
});
