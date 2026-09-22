import { afterEach, describe, expect, it, vi } from "vitest";
import { appOrigin, microsoftEnabled, microsoftOptions } from "../src/lib/auth";
afterEach(() => vi.unstubAllEnvs());
describe("Microsoft sign-in configuration", () => {
  it("stays disabled until explicitly enabled", () => {
    vi.stubEnv("AUTH_MICROSOFT_ENABLED", "");
    expect(microsoftEnabled()).toBe(false);
    vi.stubEnv("AUTH_MICROSOFT_ENABLED", "false");
    expect(microsoftEnabled()).toBe(false);
    vi.stubEnv("AUTH_MICROSOFT_ENABLED", "true");
    expect(microsoftEnabled()).toBe(true);
  });
  it("uses Azure email scope and an allowlisted local return path", () => {
    vi.stubEnv("APP_URL", "https://playchambana.com/");
    const input = microsoftOptions("//evil.example");
    expect(input.provider).toBe("azure");
    expect(input.options.scopes).toBe("email");
    expect(input.options.queryParams).not.toHaveProperty("hd");
    expect(input.options.redirectTo).toBe(
      "https://playchambana.com/auth/callback?next=%2Fmissions",
    );
  });
  it("rejects unsafe origins and never uses the incoming Host header", () => {
    vi.stubEnv("APP_URL", "https://user:secret@example.com");
    expect(() => appOrigin()).toThrow();
    vi.stubEnv("APP_URL", "javascript:alert(1)");
    expect(() => appOrigin()).toThrow();
  });
});
