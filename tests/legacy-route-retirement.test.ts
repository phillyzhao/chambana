import { readdirSync } from "node:fs";
import { NextRequest } from "next/server";
// The installed Next package still exports the matcher helper under this name.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  createServerClient: vi.fn(() => {
    throw new Error("Retired routes must not contact authentication");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import RetiredBetaPage from "../src/app/[...legacy]/page";
import { config, proxy } from "../src/proxy";
import {
  DESKTOP_HOME,
  IOS_PREVIEW,
  retiredBetaDestination,
} from "../src/lib/site-routes";

const retiredRoutes = [
  ["/login", DESKTOP_HOME],
  ["/join", `${DESKTOP_HOME}&screen=groups`],
  ["/missions", `${DESKTOP_HOME}&screen=missions`],
  ["/groups", `${DESKTOP_HOME}&screen=groups`],
  ["/profile", DESKTOP_HOME],
  ["/people", DESKTOP_HOME],
  ["/leaderboard", DESKTOP_HOME],
  ["/admin", DESKTOP_HOME],
  ["/about", DESKTOP_HOME],
  ["/guidelines", DESKTOP_HOME],
  ["/auth/callback", DESKTOP_HOME],
];

const currentAndUnknownRoutes = [
  "/",
  IOS_PREVIEW,
  "/api/health",
  "/api/avatars/example",
  "/api/cron/verify",
  "/_next/static/app.js",
  "/design-assets/lounge.jpg",
  "/groups-new",
  "/missions-extra",
  "/login-other",
  "/auth/callback-other",
  "/unknown",
  "/constructor",
  "/toString",
];

beforeEach(() => vi.clearAllMocks());

describe("retired beta route map", () => {
  it.each(retiredRoutes)(
    "maps %s and its descendants to a fixed preview",
    (path, destination) => {
      for (const suffix of [
        "",
        "/",
        "/old-id",
        "/old-id/details",
        "/old-id/photo.jpg",
      ]) {
        expect(retiredBetaDestination(`${path}${suffix}`)).toBe(destination);
        expect(
          unstable_doesMiddlewareMatch({
            config,
            nextConfig: {},
            url: `${path}${suffix}`,
          }),
        ).toBe(true);
      }
    },
  );

  it.each(currentAndUnknownRoutes)(
    "leaves %s outside the retired route boundary",
    (path) => {
      expect(retiredBetaDestination(path)).toBeNull();
      expect(
        unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }),
      ).toBe(false);
    },
  );

  it("does not interpret URLs or similarly named paths as retired paths", () => {
    for (const path of [
      "https://example.com/groups",
      "//groups",
      "groups",
      "/Groups",
      "/groups?next=/login",
    ]) {
      expect(retiredBetaDestination(path)).toBeNull();
    }
  });
});

describe("retirement proxy", () => {
  it.each(retiredRoutes)(
    "redirects GET and POST %s without forwarding beta input",
    async (path, destination) => {
      for (const method of ["GET", "POST"]) {
        const request = new NextRequest(
          `https://playchambana.com${path}?code=private-code&next=https%3A%2F%2Fevil.example&view=iphone&screen=unknown&error=private-notice`,
          {
            method,
            ...(method === "POST" ? { body: "private-form-body" } : {}),
          },
        );
        const readCookies = vi.fn(() => {
          throw new Error("Retirement must not inspect session cookies");
        });
        Object.defineProperty(request, "cookies", { get: readCookies });

        const response = await proxy(request);

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe(
          `https://playchambana.com${destination}`,
        );
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(response.headers.get("referrer-policy")).toBe("no-referrer");
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(await response.text()).toBe("");
        expect(readCookies).not.toHaveBeenCalled();
      }
      expect(mocks.createServerClient).not.toHaveBeenCalled();
    },
  );

  it.each(currentAndUnknownRoutes)(
    "passes %s through without refreshing a session",
    async (path) => {
      const request = new NextRequest(`https://playchambana.com${path}`);
      const readCookies = vi.fn(() => {
        throw new Error("Proxy must not inspect session cookies");
      });
      Object.defineProperty(request, "cookies", { get: readCookies });

      const response = await proxy(request);

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(readCookies).not.toHaveBeenCalled();
      expect(mocks.createServerClient).not.toHaveBeenCalled();
    },
  );
});

describe("legacy page fallback", () => {
  it.each(retiredRoutes)(
    "redirects %s without loading a community page",
    async (path, destination) => {
      await expect(
        RetiredBetaPage({
          params: Promise.resolve({
            legacy: `${path}/old-id/details`.slice(1).split("/"),
          }),
        }),
      ).rejects.toThrow(`redirect:${destination}`);
      expect(mocks.redirect).toHaveBeenCalledWith(destination);
      expect(mocks.createServerClient).not.toHaveBeenCalled();
    },
  );

  it.each(["/unknown", "/groups-new", "/auth/callback-other"])(
    "keeps %s as not found",
    async (path) => {
      await expect(
        RetiredBetaPage({
          params: Promise.resolve({ legacy: path.slice(1).split("/") }),
        }),
      ).rejects.toThrow("not-found");
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );

  it("ships only the waitlist, preview, and retirement fallback pages with no beta layouts", () => {
    const files = readdirSync(new URL("../src/app", import.meta.url), {
      recursive: true,
      encoding: "utf8",
    });
    expect(
      files.filter((path) => /(^|\/)page\.tsx$/.test(path)).sort(),
    ).toEqual(["[...legacy]/page.tsx", "design-preview/page.tsx", "page.tsx"]);
    expect(files.filter((path) => /(^|\/)layout\.tsx$/.test(path))).toEqual([
      "layout.tsx",
    ]);
  });
});
