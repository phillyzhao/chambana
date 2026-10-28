import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import { unlockPreview } from "../src/app/preview-access-actions";
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

  it.each(["groups", "inbox", "profile"])(
    "issues one secure shared cookie and keeps the %s destination",
    async (screen) => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(
        unlockPreview(
          initial,
          form("0010110", `/design-preview?view=desktop&screen=${screen}`),
        ),
      ).rejects.toThrow(
        `redirect:/design-preview?view=desktop&screen=${screen}`,
      );
      expect(mocks.set).toHaveBeenCalledOnce();
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
    },
  );

  it.each([
    "//evil.example",
    "/login?next=%2Fgroups",
    "/design-preview?view=desktop&screen=groups&screen=missions",
    "/design-preview?view=desktop&screen=inbox&screen=inbox",
    "/design-preview?view=desktop&screen=inbox&screen=groups",
    "/design-preview?view=desktop&screen=inbox&next=%2Flogin",
    "/design-preview?view=desktop&screen=profile&screen=profile",
    "/design-preview?view=desktop&screen=profile&screen=inbox",
    "/design-preview?view=desktop&screen=profile&next=https%3A%2F%2Fevil.example",
    "/design-preview?view=desktop&screen=profile&code=private-code",
    "/design-preview?view=desktop&token=private-code",
  ])(
    "sends retired or invalid destination %s to desktop Home",
    async (destination) => {
      await expect(
        unlockPreview(initial, form("0010110", destination)),
      ).rejects.toThrow(/^redirect:\/design-preview\?view=desktop$/);
    },
  );

  it("keeps the default iPhone preview destination", async () => {
    await expect(unlockPreview(initial, form())).rejects.toThrow(
      /^redirect:\/design-preview$/,
    );
  });
});

describe("preview page protection", () => {
  it("checks the signature when reading the request cookie", async () => {
    expect(await hasPreviewAccess()).toBe(false);
    mocks.get.mockReturnValue({ value: "0010110" });
    expect(await hasPreviewAccess()).toBe(false);
    mocks.get.mockReturnValue({ value: createPreviewToken(secret) });
    expect(await hasPreviewAccess()).toBe(true);
    expect(mocks.get).toHaveBeenCalledWith(PREVIEW_ACCESS_COOKIE);
  });
});
