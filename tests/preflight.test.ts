import { describe, it, expect } from "vitest";
import { checkEnvironment } from "../scripts/preflight.mjs";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public",
  SUPABASE_SERVICE_ROLE_KEY: "private",
  APP_URL: "https://playchambana.com",
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "gemini-2.5-flash",
  CRON_SECRET: "x".repeat(32),
  SUPPORT_EMAIL: "support@example.com",
};
describe("deployment preflight", () => {
  it("accepts a configured Node 24 host without printing keys", () =>
    expect(
      checkEnvironment(env, { production: true, nodeVersion: "24.0.0" }),
    ).toEqual([]));
  it("rejects public secrets, obsolete Node and localhost production URLs", () => {
    const issues = checkEnvironment(
      {
        ...env,
        APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_GEMINI_API_KEY: "do-not-print",
      },
      { production: true, nodeVersion: "20.0.0" },
    );
    expect(issues).toHaveLength(3);
    expect(issues.join(" ")).not.toContain("do-not-print");
  });
});
