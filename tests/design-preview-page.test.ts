import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasPreviewAccess: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  DesktopHomePreview: vi.fn(() => null),
  IOSConcepts: vi.fn(() => null),
  PreviewAccessGate: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("../src/lib/preview-access", () => ({
  hasPreviewAccess: mocks.hasPreviewAccess,
}));
vi.mock("../src/components/desktop-home-preview", () => ({
  DesktopHomePreview: mocks.DesktopHomePreview,
}));
vi.mock("../src/components/ios-concepts", () => ({
  IOSConcepts: mocks.IOSConcepts,
}));
vi.mock("../src/components/preview-access-gate", () => ({
  PreviewAccessGate: mocks.PreviewAccessGate,
}));

import DesignPreviewPage from "../src/app/design-preview/page";

function page(view?: string | string[], screen?: string | string[]) {
  return DesignPreviewPage({
    searchParams: Promise.resolve({ view, screen }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("CHAMBANA_DESIGN_PREVIEW", "true");
  mocks.hasPreviewAccess.mockResolvedValue(false);
});

afterEach(() => vi.unstubAllEnvs());

describe("design preview access and view selection", () => {
  it.each([undefined, "false"])(
    "hides the desktop preview when the production flag is %s",
    async (flag) => {
      vi.stubEnv("CHAMBANA_DESIGN_PREVIEW", flag);
      mocks.hasPreviewAccess.mockResolvedValue(true);

      await expect(page("desktop")).rejects.toThrow("not-found");
      expect(mocks.notFound).toHaveBeenCalledOnce();
      expect(mocks.hasPreviewAccess).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "false"])(
    "hides the Groups deep link when the production flag is %s",
    async (flag) => {
      vi.stubEnv("CHAMBANA_DESIGN_PREVIEW", flag);
      mocks.hasPreviewAccess.mockResolvedValue(true);

      await expect(page("desktop", "groups")).rejects.toThrow("not-found");
      expect(mocks.notFound).toHaveBeenCalledOnce();
      expect(mocks.hasPreviewAccess).not.toHaveBeenCalled();
    },
  );

  it("requires preview access and preserves the desktop unlock destination", async () => {
    const result = await page("desktop");

    expect(mocks.hasPreviewAccess).toHaveBeenCalledOnce();
    expect(result.type).toBe(mocks.PreviewAccessGate);
    expect(result.props.destination).toBe("/design-preview?view=desktop");
  });

  it("selects the desktop Home after preview access is granted", async () => {
    mocks.hasPreviewAccess.mockResolvedValue(true);

    const result = await page("desktop");

    expect(mocks.hasPreviewAccess).toHaveBeenCalledOnce();
    expect(result.type).toBe(mocks.DesktopHomePreview);
  });

  it.each(["missions", "groups"])(
    "preserves the supported %s deep link through the access gate",
    async (screen) => {
      const result = await page("desktop", screen);

      expect(result.type).toBe(mocks.PreviewAccessGate);
      expect(result.props.destination).toBe(
        `/design-preview?view=desktop&screen=${screen}`,
      );
    },
  );

  it.each(["missions", "groups"])(
    "renders the desktop client for an unlocked %s deep link",
    async (screen) => {
      mocks.hasPreviewAccess.mockResolvedValue(true);

      const result = await page("desktop", screen);

      expect(result.type).toBe(mocks.DesktopHomePreview);
      expect(mocks.hasPreviewAccess).toHaveBeenCalledOnce();
    },
  );

  it.each([
    { screen: "unknown" },
    { screen: "Missions" },
    { screen: "Groups" },
    { screen: "//evil.example" },
    { screen: ["missions", "home"] },
    { screen: ["missions", "missions"] },
    { screen: ["groups", "home"] },
    { screen: ["groups", "groups"] },
    { screen: ["groups", "missions"] },
  ])(
    "sanitizes unsupported desktop screen $screen to Home at unlock",
    async ({ screen }) => {
      const result = await page("desktop", screen);

      expect(result.type).toBe(mocks.PreviewAccessGate);
      expect(result.props.destination).toBe("/design-preview?view=desktop");
    },
  );

  it.each([
    { view: undefined, screen: "missions" },
    { view: "iphone", screen: "missions" },
    { view: ["desktop", "iphone"], screen: "missions" },
    { view: undefined, screen: "groups" },
    { view: "iphone", screen: "groups" },
    { view: ["desktop", "iphone"], screen: "groups" },
  ])(
    "does not apply the $screen screen to non-desktop view $view",
    async ({ view, screen }) => {
      const locked = await page(view, screen);
      expect(locked.type).toBe(mocks.PreviewAccessGate);
      expect(locked.props.destination).toBe("/design-preview");

      mocks.hasPreviewAccess.mockResolvedValue(true);
      const unlocked = await page(view, screen);
      expect(unlocked.type).toBe(mocks.IOSConcepts);
    },
  );

  it.each([
    { view: undefined },
    { view: "unknown" },
    { view: ["desktop", "iphone"] },
  ])(
    "preserves the iPhone preview for the default or unsupported view $view",
    async ({ view }) => {
      mocks.hasPreviewAccess.mockResolvedValue(true);

      const result = await page(view);

      expect(result.type).toBe(mocks.IOSConcepts);
    },
  );

  it("keeps the default iPhone preview behind the same access gate", async () => {
    const result = await page();

    expect(result.type).toBe(mocks.PreviewAccessGate);
    expect(result.props.destination).toBe("/design-preview");
  });
});
