import { createServerClient, isChunkLike } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { GET } from "../src/app/auth/callback/route";

const origin = "https://playchambana.com";
const supabaseUrl = "https://fixture.supabase.co";
const sessionKey = "sb-fixture-auth-token";
const secret = "PRIVATE-FIXTURE-MUST-NOT-APPEAR-IN-LOGS";
let logger: MockInstance<(...data: unknown[]) => void>;

beforeEach(() => {
  vi.stubEnv("APP_URL", origin);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-key");
  logger = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Exercise the installed SSR/auth libraries, including their actual PKCE
// encoding, chunking, cleanup, and multiple setAll calls. Only HTTP is faked.
async function loginAttempt() {
  const jar = new Map<string, string>();
  const client = createServerClient(supabaseUrl, "fixture-key", {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const { name, value, options } of items) {
          if (options.maxAge === 0) jar.delete(name);
          else jar.set(name, value);
        }
      },
    },
  });
  const begin = async () => {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${origin}/auth/callback`, scopes: "email" },
    });
    expect(error).toBeNull();
    const callback = new URL(
      new URL(data.url!).searchParams.get("redirect_to")!,
    );
    callback.searchParams.set("code", secret);
    return callback;
  };
  const callback = await begin();
  const request = () =>
    new NextRequest(callback, {
      headers: {
        cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
      },
    });
  return { jar, callback, request, begin };
}

function authService({
  email = "student@illinois.edu",
  confirmed = true,
  large = false,
  userFailure = false,
} = {}) {
  const user = {
    id: "bd47f489-463d-4b69-bf8c-1e5eb039b294",
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: confirmed ? new Date().toISOString() : undefined,
    app_metadata: { provider: "azure" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const session = {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`,
    refresh_token: secret,
    token_type: "bearer",
    expires_in: 3600,
    ...(large
      ? {
          provider_token: secret.repeat(260),
          provider_refresh_token: secret.repeat(40),
        }
      : {}),
    user,
  };
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/token?")) return Response.json(session);
    if (url.endsWith("/user"))
      return userFailure
        ? Response.json(
            { msg: secret, code: "unexpected_failure" },
            { status: 500 },
          )
        : Response.json(user);
    if (url.includes("/logout")) return new Response(null, { status: 204 });
    throw new Error(`Unexpected test request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return { session, fetcher };
}

function decodeSession(response: NextResponse) {
  const values = response.cookies
    .getAll()
    .filter(
      ({ name, value, maxAge }) =>
        isChunkLike(name, sessionKey) && value && maxAge !== 0,
    )
    .sort(
      (a, b) =>
        Number(a.name.split(".").at(-1)) - Number(b.name.split(".").at(-1)),
    )
    .map(({ value }) => value)
    .join("");
  return JSON.parse(
    Buffer.from(values.slice("base64-".length), "base64url").toString(),
  );
}

describe("production auth callback cookie transport", () => {
  it.each([false, true])(
    "returns a complete session and cache headers (large OAuth session: %s)",
    async (large) => {
      const { session } = authService({ large });
      const flow = await loginAttempt();
      // A stale unsplit cookie and a leftover high-index chunk must both expire.
      flow.jar.set(sessionKey, "stale");
      flow.jar.set(`${sessionKey}.99`, "stale-tail");
      flow.jar.set("unrelated", "keep");
      const response = await GET(flow.request());
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${origin}/missions`);
      expect(decodeSession(response)).toMatchObject(session);
      expect(response.cookies.get(`${sessionKey}.99`)?.maxAge).toBe(0);
      expect(response.cookies.has("unrelated")).toBe(false);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("pragma")).toBe("no-cache");
      expect(response.headers.get("expires")).toBe("0");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("x-auth-callback-id")).toMatch(
        /^[0-9a-f-]{36}$/,
      );
      expect(response.headers.getSetCookie().length).toBe(
        response.cookies.getAll().length,
      );
      if (large) {
        expect(response.cookies.get(`${sessionKey}.0`)?.value).toBeTruthy();
        expect(response.cookies.get(sessionKey)?.maxAge).toBe(0);
      }
      expect(JSON.stringify(logger.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(logger.mock.calls)).not.toContain(
        "student@illinois.edu",
      );
    },
  );

  it.each([
    { email: "person@gmail.com" },
    { email: "student@illinois.edu.evil.example" },
    { confirmed: false },
    { userFailure: true },
  ])(
    "clears newly issued session chunks when validation fails: %j",
    async (options) => {
      authService({ ...options, large: true });
      const flow = await loginAttempt();
      const response = await GET(flow.request());
      expect(response.headers.get("location")).toContain(
        `${origin}/login?error=`,
      );
      const cookies = response.cookies
        .getAll()
        .filter(({ name }) => isChunkLike(name, sessionKey));
      expect(cookies.length).toBeGreaterThan(0);
      expect(
        cookies.every(({ value, maxAge }) => value === "" && maxAge === 0),
      ).toBe(true);
      expect(JSON.stringify(logger.mock.calls)).not.toContain(secret);
    },
  );

  it("turns an exchange exception into a safe redirect with a correlated diagnostic", async () => {
    authService();
    const flow = await loginAttempt();
    vi.spyOn(NextResponse.prototype, "cookies", "get").mockImplementationOnce(
      () => {
        throw new Error(secret);
      },
    );
    const response = await GET(flow.request());
    expect(response.headers.get("location")).toContain("/login?error=");
    const events = logger.mock.calls
      .filter(
        ([line]) =>
          typeof line === "string" &&
          line.startsWith('{"event":"auth_callback"'),
      )
      .map(([line]) => JSON.parse(String(line)));
    expect(events).toContainEqual(
      expect.objectContaining({
        event: "auth_callback",
        stage: "cookie_write",
        outcome: "exception",
        id: response.headers.get("x-auth-callback-id"),
      }),
    );
    expect(JSON.stringify(events)).not.toContain(secret);
    expect(
      logger.mock.calls.map(([line]) => String(line)).join("\n"),
    ).not.toContain(secret);
  });

  it("preserves an existing session when a callback has no code or has an invalid code", async () => {
    const flow = await loginAttempt();
    flow.jar.set(sessionKey, "existing-email-session");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { msg: secret, code: "bad_code_verifier" },
          { status: 400 },
        ),
      ),
    );
    for (const code of [secret, null]) {
      if (code) flow.callback.searchParams.set("code", code);
      else flow.callback.searchParams.delete("code");
      const response = await GET(flow.request());
      expect(response.status).toBe(307);
      expect(response.cookies.has(sessionKey)).toBe(false);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("does not redirect a successful login to an untrusted next URL", async () => {
    authService();
    const flow = await loginAttempt();
    flow.callback.searchParams.set("next", "https://evil.example");
    expect((await GET(flow.request())).headers.get("location")).toBe(
      `${origin}/missions`,
    );
  });
});
