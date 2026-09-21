import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/cron/verify/route";
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
