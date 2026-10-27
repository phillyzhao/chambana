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

function page(view?: string | string[]) {
  return DesignPreviewPage({
    searchParams: Promise.resolve(view === undefined ? {} : { view }),
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
