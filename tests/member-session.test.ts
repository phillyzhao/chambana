import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));

import { refreshMemberSession } from "../src/lib/member-session";
import { config, proxy } from "../src/proxy";

type CookieWrite = {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
};
let cookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (items: CookieWrite[]) => void;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-only-key");
  vi.stubEnv("NODE_ENV", "production");
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "member-a" } },
    error: null,
  });
  mocks.create.mockImplementation((_url, _key, options) => {
    cookies = options.cookies;
    return { auth: { getUser: mocks.getUser } };
  });
});
afterEach(() => vi.unstubAllEnvs());

function request(
  path = "/app",
  cookie = "sb-project-auth-token=old; preview=allowed",
) {
  return new NextRequest(`https://playchambana.com${path}`, {
    headers: { cookie },
  });
}

describe("member session refresh", () => {
  it("keeps every refresh batch, including rotations and deletion, on the response", async () => {
    mocks.getUser.mockImplementation(async () => {
      cookies.setAll([
        {
          name: "sb-project-auth-token",
          value: "",
          options: { path: "/", maxAge: 0 },
        },
        {
          name: "sb-project-auth-token.0",
          value: "first",
          options: { path: "/", maxAge: 3600 },
        },
      ]);
      expect(cookies.getAll()).toContainEqual({
        name: "sb-project-auth-token.0",
        value: "first",
      });
      cookies.setAll([
        {
          name: "sb-project-auth-token.1",
          value: "second",
          options: { path: "/", maxAge: 3600 },
        },
      ]);
      cookies.setAll([
        {
          name: "sb-project-auth-token.0",
          value: "updated",
          options: { path: "/", maxAge: 7200 },
        },
      ]);
      return { data: { user: { id: "member-a" } }, error: null };
    });
    const incoming = request();
    const response = await refreshMemberSession(incoming);

    expect(response.cookies.get("sb-project-auth-token")).toMatchObject({
      value: "",
      maxAge: 0,
      path: "/",
    });
    expect(response.cookies.get("sb-project-auth-token.0")).toMatchObject({
      value: "updated",
      maxAge: 7200,
      path: "/",
    });
    expect(response.cookies.get("sb-project-auth-token.1")).toMatchObject({
      value: "second",
      maxAge: 3600,
      path: "/",
    });
    expect(response.cookies.getAll()).toHaveLength(3);
    expect(incoming.cookies.get("sb-project-auth-token.0")?.value).toBe(
      "updated",
    );
    const upstreamCookies = response.headers.get("x-middleware-request-cookie");
    expect(upstreamCookies).toContain("sb-project-auth-token.0=updated");
    expect(upstreamCookies).toContain("sb-project-auth-token.1=second");
    expect(upstreamCookies).toContain("preview=allowed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("enforces server-only secure cookies across every batch", async () => {
    mocks.getUser.mockImplementation(async () => {
      for (const name of [
        "sb-project-auth-token.0",
        "sb-project-auth-token.1",
      ]) {
        cookies.setAll([
          {
            name,
            value: "credential",
            options: { httpOnly: false, secure: false, sameSite: "none" },
          },
        ]);
      }
      return { data: { user: null }, error: null };
    });
    const response = await refreshMemberSession(request());
    for (const cookie of response.cookies.getAll()) {
      expect(cookie).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }
  });

  it("allows local HTTP cookies during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.getUser.mockImplementation(async () => {
      cookies.setAll([{ name: "sb-project-auth-token", value: "refreshed" }]);
      return { data: { user: null }, error: null };
    });
    const response = await refreshMemberSession(request());
    expect(response.cookies.get("sb-project-auth-token")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
    });
    expect(response.cookies.get("sb-project-auth-token")?.secure).not.toBe(
      true,
    );
  });

  it.each(["", "preview=allowed; unrelated=value"])(
    "does not contact Auth without Supabase cookies: %s",
    async (cookie) => {
      const response = await refreshMemberSession(request("/app", cookie));
      expect(mocks.create).not.toHaveBeenCalled();
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])(
    "leaves configuration errors to the route guard when %s is absent",
    async (key) => {
      vi.stubEnv(key, "");
      const response = await refreshMemberSession(request());
      expect(mocks.create).not.toHaveBeenCalled();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it("keeps session cleanup if Auth throws, without making an authorization decision", async () => {
    mocks.getUser.mockImplementation(async () => {
      cookies.setAll([
        { name: "sb-project-auth-token", value: "", options: { maxAge: 0 } },
      ]);
      throw new Error("provider unavailable");
    });
    const response = await refreshMemberSession(request());
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-project-auth-token")).toMatchObject({
      value: "",
      maxAge: 0,
    });
    expect(await response.text()).toBe("");
  });
});

describe("member proxy boundary", () => {
  it.each([
    "/app",
    "/app/details",
    "/account",
    "/account/callback?code=private",
    "/api/member/submissions/reserve",
    "/api/member/submissions/finalize",
  ])("refreshes authenticated member route %s", async (path) => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }),
    ).toBe(true);
    const response = await proxy(request(path));
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([
    "/application",
    "/account-other",
    "/api/member-other/submissions",
    "/design-preview",
    "/mission-admin",
  ])("does not refresh similarly named or preview routes: %s", async (path) => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }),
    ).toBe(false);
    const response = await proxy(request(path));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps the legacy email callback retired, even with session cookies", async () => {
    const response = await proxy(
      request("/auth/callback?code=private&next=/app"),
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://playchambana.com/design-preview?view=desktop",
    );
  });
});
