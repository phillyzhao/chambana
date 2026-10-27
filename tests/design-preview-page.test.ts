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

  it("preserves the supported Missions deep link through the access gate", async () => {
    const result = await page("desktop", "missions");

    expect(result.type).toBe(mocks.PreviewAccessGate);
    expect(result.props.destination).toBe(
      "/design-preview?view=desktop&screen=missions",
    );
  });

  it("renders the desktop client for an unlocked Missions deep link", async () => {
    mocks.hasPreviewAccess.mockResolvedValue(true);

    const result = await page("desktop", "missions");

    expect(result.type).toBe(mocks.DesktopHomePreview);
    expect(mocks.hasPreviewAccess).toHaveBeenCalledOnce();
  });

  it.each([
    "unknown",
    "Missions",
    "//evil.example",
    ["missions", "home"],
    ["missions", "missions"],
  ])(
    "sanitizes unsupported desktop screen %j to Home at unlock",
    async (screen) => {
      const result = await page("desktop", screen);

      expect(result.type).toBe(mocks.PreviewAccessGate);
      expect(result.props.destination).toBe("/design-preview?view=desktop");
    },
  );

  it.each([undefined, "iphone", ["desktop", "iphone"]])(
    "does not apply a Missions screen to non-desktop view %j",
    async (view) => {
      const locked = await page(view, "missions");
      expect(locked.type).toBe(mocks.PreviewAccessGate);
      expect(locked.props.destination).toBe("/design-preview");

      mocks.hasPreviewAccess.mockResolvedValue(true);
      const unlocked = await page(view, "missions");
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
