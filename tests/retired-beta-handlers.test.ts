import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: vi.fn(),
  serviceDatabase: vi.fn(),
  isConfigured: vi.fn(),
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  verifySubmission: vi.fn(),
  deliverNotifications: vi.fn(),
  emailConfigured: vi.fn(),
  normalizePhoto: vi.fn(),
  allowRequest: vi.fn(),
  cookies: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("../src/lib/supabase", () => ({
  database: mocks.database,
  serviceDatabase: mocks.serviceDatabase,
  isConfigured: mocks.isConfigured,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("../src/lib/verification", () => ({
  verifySubmission: mocks.verifySubmission,
}));
vi.mock("../src/lib/email", () => ({
  deliverNotifications: mocks.deliverNotifications,
  emailConfigured: mocks.emailConfigured,
}));
vi.mock("../src/lib/photos", () => ({ normalizePhoto: mocks.normalizePhoto }));
vi.mock("../src/lib/rate-limit", () => ({ allowRequest: mocks.allowRequest }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new Error(`redirect:${location}`);
  },
}));

import { signIn, signOut, mutate } from "../src/app/actions";
import {
  GET as callbackGet,
  POST as callbackPost,
} from "../src/app/auth/callback/route";
import {
  GET as avatarGet,
  POST as avatarPost,
} from "../src/app/api/avatars/[id]/route";
import {
  GET as cronGet,
  POST as cronPost,
} from "../src/app/api/cron/verify/route";
import { GET as healthGet } from "../src/app/api/health/route";
import {
  createPreviewToken,
  PREVIEW_ACCESS_COOKIE,
} from "../src/lib/preview-access-token";

const destination = "/design-preview?view=desktop";
const secret = "a-test-signing-secret-that-is-long-enough";
const cronSecret = "retired-cron-secret-that-is-long-enough";
const userId = "20000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-test-key");
  vi.stubEnv("PREVIEW_ACCESS_SECRET", secret);
  vi.stubEnv("CRON_SECRET", cronSecret);
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.isConfigured.mockReturnValue(true);
});

afterEach(() => {
  for (const [name, dependency] of Object.entries(mocks)) {
    expect(
      dependency,
      `${name} must stay unused by retired endpoints`,
    ).not.toHaveBeenCalled();
  }
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function request(path: string, method: "GET" | "POST", authenticated = true) {
  return new Request(`https://playchambana.com${path}`, {
    method,
    headers: {
      ...(authenticated
        ? {
            authorization: `Bearer ${cronSecret}`,
            cookie: `${PREVIEW_ACCESS_COOKIE}=${createPreviewToken(secret)}; sb-example-auth-token=old-session`,
          }
        : {}),
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "http",
    },
    ...(method === "POST"
      ? { body: "code=private-code&next=https://attacker.example" }
      : {}),
  });
}

describe("retired authentication callback", () => {
  it.each([
    ["GET", callbackGet],
    ["POST", callbackPost],
  ] as const)(
    "%s drops credentials and all return destinations",
    async (method, handle) => {
      const response = await handle(
        request(
          "/auth/callback?code=private-code&next=https://attacker.example&token=private-token",
          method,
        ),
      );
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(destination);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.has("set-cookie")).toBe(false);
      expect(await response.text()).toBe("");
      expect(JSON.stringify([...response.headers])).not.toMatch(
        /private-code|private-token|attacker/,
      );
    },
  );
});

describe("retired beta APIs", () => {
  it.each([
    ["GET", avatarGet],
    ["POST", avatarPost],
  ] as const)(
    "avatar %s is gone for valid and invalid profile IDs",
    async (method, handle) => {
      for (const id of [userId, "not-a-profile"]) {
        const response = await handle(request(`/api/avatars/${id}`, method), {
          params: Promise.resolve({ id }),
        });
        expect(response.status).toBe(410);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.has("set-cookie")).toBe(false);
        expect(response.headers.has("location")).toBe(false);
        expect(await response.json()).toEqual({
          error: "The beta has been retired.",
        });
      }
    },
  );

  it.each([
    ["GET", cronGet],
    ["POST", cronPost],
  ] as const)(
    "cron %s stays retired with and without a valid bearer secret",
    async (method, handle) => {
      for (const authenticated of [false, true]) {
        const response = await handle(
          request("/api/cron/verify", method, authenticated),
        );
        expect(response.status).toBe(410);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.has("set-cookie")).toBe(false);
        expect(response.headers.has("location")).toBe(false);
        expect(await response.json()).toEqual({
          error: "The beta has been retired.",
        });
      }
    },
  );
});

describe("retired beta server actions", () => {
  it.each([false, true])(
    "ignores submitted fields even when preview access is %s",
    async (authorized) => {
      mocks.cookies.mockResolvedValue({
        get: () =>
          authorized ? { value: createPreviewToken(secret) } : undefined,
        set: vi.fn(),
      });
      for (const action of [
        "delete_group",
        "avatar",
        "submit",
        "create_group",
      ]) {
        const form = new FormData();
        form.set("action", action);
        form.set("next", "https://attacker.example");
        form.set("back", "/admin");
        form.set("method", "microsoft");
        form.set("email", "member@illinois.edu");
        form.set("user_id", userId);
        form.set("group_id", userId);
        form.set("avatar", new File(["old-photo"], "avatar.jpg"));
        await expect(signIn(form)).rejects.toThrow(`redirect:${destination}`);
        await expect(mutate(form)).rejects.toThrow(`redirect:${destination}`);
      }
      await expect(signOut()).rejects.toThrow(`redirect:${destination}`);
    },
  );
});

describe("current application health", () => {
  it("reports liveness without the beta database or its configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const response = await healthGet();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
