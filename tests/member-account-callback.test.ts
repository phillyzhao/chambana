import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  create: vi.fn(),
  exchange: vi.fn(),
  verify: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
vi.mock("../src/lib/supabase", () => ({ isConfigured: mocks.configured }));
import { GET } from "../src/app/account/callback/route";

const user = {
  id: "member-a",
  email: "member@illinois.edu",
  email_confirmed_at: "2026-11-11T00:00:00Z",
};
let cookieWriter: (
  items: { name: string; value: string; options?: object }[],
) => void;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-only-public-key");
  vi.stubEnv("NODE_ENV", "production");
  mocks.configured.mockReturnValue(true);
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.create.mockImplementation((_url, _key, options) => {
    cookieWriter = options.cookies.setAll;
    return {
      auth: {
        exchangeCodeForSession: mocks.exchange,
        verifyOtp: mocks.verify,
        getUser: mocks.getUser,
        signOut: mocks.signOut,
      },
    };
  });
});
afterEach(() => vi.unstubAllEnvs());
function request(query = "code=valid-code") {
  return new NextRequest(`https://playchambana.com/account/callback?${query}`);
}

describe("member email callback", () => {
  it("exchanges a PKCE code and always returns to the member app", async () => {
    const response = await GET(
      request("code=valid-code&next=https://evil.test/steal"),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://playchambana.com/app",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(mocks.exchange).toHaveBeenCalledWith("valid-code");
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });
  it("accepts the documented email-token-hash callback", async () => {
    const hash = "a".repeat(64);
    expect(
      (await GET(request(`token_hash=${hash}&type=email`))).headers.get(
        "location",
      ),
    ).toBe("https://playchambana.com/app");
    expect(mocks.verify).toHaveBeenCalledWith({
      token_hash: hash,
      type: "email",
    });
  });
  it.each([
    "",
    "error=access_denied",
    "token_hash=short&type=email",
    `token_hash=${"a".repeat(64)}&type=recovery`,
    `code=x&token_hash=${"a".repeat(64)}&type=email`,
  ])(
    "rejects invalid callback input without an auth request: %s",
    async (query) => {
      const response = await GET(request(query));
      expect(response.headers.get("location")).toBe(
        "https://playchambana.com/app?auth_error=expired",
      );
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it("writes secure HttpOnly cookies onto the redirect response", async () => {
    mocks.exchange.mockImplementation(async () => {
      cookieWriter([
        {
          name: "sb-test-auth-token",
          value: "test-session",
          options: { path: "/" },
        },
      ]);
      return { error: null };
    });
    const response = await GET(request());
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("test-session");
  });
  it.each([
    null,
    { ...user, email: "member@gmail.com" },
    { ...user, email_confirmed_at: null },
  ])(
    "rejects sessions without a verified campus identity",
    async (candidate) => {
      mocks.getUser.mockResolvedValue({
        data: { user: candidate },
        error: null,
      });
      expect((await GET(request())).headers.get("location")).toContain(
        "auth_error=expired",
      );
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    },
  );
  it("expires any partial credential written by a failed exchange", async () => {
    mocks.exchange.mockImplementation(async () => {
      cookieWriter([{ name: "sb-test-auth-token", value: "partial-session" }]);
      return { error: { message: "private failure" } };
    });
    const response = await GET(request());
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).not.toContain("partial-session");
    expect(response.headers.get("location")).not.toContain("private failure");
  });
  it("does not clear an existing session when an expired link writes no cookies", async () => {
    mocks.exchange.mockResolvedValue({ error: { message: "expired" } });
    const response = await GET(request());
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
