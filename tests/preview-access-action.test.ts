import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  database: vi.fn(),
  configured: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("../src/lib/supabase", () => ({
  database: mocks.database,
  serviceDatabase: vi.fn(),
  isConfigured: mocks.configured,
}));
import { unlockPreview } from "../src/app/preview-access-actions";
import { signIn } from "../src/app/actions";
import { hasPreviewAccess } from "../src/lib/preview-access";
import {
  createPreviewToken,
  PREVIEW_ACCESS_COOKIE,
  PREVIEW_ACCESS_MAX_AGE,
  verifyPreviewToken,
} from "../src/lib/preview-access-token";

const secret = "a-test-signing-secret-that-is-long-enough";
const initial = { error: "" };
function form(code = "0010110", destination = "/design-preview") {
  const input = new FormData();
  input.set("code", code);
  input.set("destination", destination);
  return input;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PREVIEW_ACCESS_SECRET", secret);
  mocks.get.mockReturnValue(undefined);
  mocks.configured.mockReturnValue(false);
});
afterEach(() => vi.unstubAllEnvs());

describe("access code action", () => {
  it("does not set a cookie for an invalid code", async () => {
    expect(await unlockPreview(initial, form("0000000"))).toEqual({
      error: "That code isn’t right. Try again.",
    });
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("fails closed if the signing secret is missing", async () => {
    vi.stubEnv("PREVIEW_ACCESS_SECRET", "");
    expect(await unlockPreview(initial, form())).toEqual({
      error: "Access is temporarily unavailable.",
    });
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("issues one secure shared cookie and keeps an allowed destination", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      unlockPreview(initial, form("0010110", "/login?next=%2Fgroups")),
    ).rejects.toThrow("redirect:/login?next=%2Fgroups");
    const [name, token, options] = mocks.set.mock.calls[0];
    expect(name).toBe(PREVIEW_ACCESS_COOKIE);
    expect(verifyPreviewToken(token, secret)).toBe(true);
    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: PREVIEW_ACCESS_MAX_AGE,
    });
  });

  it("never redirects to a submitted external destination", async () => {
    await expect(
      unlockPreview(initial, form("0010110", "//evil.example")),
    ).rejects.toThrow("redirect:/design-preview");
  });
});

describe("page and direct sign-in protection", () => {
  it("checks the signature when reading the request cookie", async () => {
    expect(await hasPreviewAccess()).toBe(false);
    mocks.get.mockReturnValue({ value: "0010110" });
    expect(await hasPreviewAccess()).toBe(false);
    mocks.get.mockReturnValue({ value: createPreviewToken(secret) });
    expect(await hasPreviewAccess()).toBe(true);
    expect(mocks.get).toHaveBeenCalledWith(PREVIEW_ACCESS_COOKIE);
  });

  it("blocks a direct sign-in action before contacting authentication", async () => {
    mocks.configured.mockReturnValue(true);
    await expect(signIn(new FormData())).rejects.toThrow(/^redirect:\/login$/);
    expect(mocks.database).not.toHaveBeenCalled();
    expect(mocks.configured).not.toHaveBeenCalled();
  });

  it("allows the regular sign-in path after access is granted", async () => {
    mocks.get.mockReturnValue({ value: createPreviewToken(secret) });
    await expect(signIn(new FormData())).rejects.toThrow(
      "The+beta+is+not+connected+yet",
    );
    expect(mocks.configured).toHaveBeenCalledOnce();
  });
});
