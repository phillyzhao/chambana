import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  service: vi.fn(),
  download: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  database: mocks.db,
  serviceDatabase: mocks.service,
}));
import { GET } from "../src/app/api/avatars/[id]/route";
const id = "20000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.service.mockReturnValue({
    storage: { from: () => ({ download: mocks.download }) },
  });
});
function profile(path: string | null) {
  mocks.db.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { avatar_path: path },
            error: null,
          }),
        }),
      }),
    }),
  });
}
it("rejects arbitrary image paths and malformed profile IDs", async () => {
  expect(
    (
      await GET(new Request("https://example.com"), {
        params: Promise.resolve({ id: "../../private" }),
      })
    ).status,
  ).toBe(404);
  profile("someone-else/private.jpg");
  expect(
    (
      await GET(new Request("https://example.com"), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(404);
  expect(mocks.download).not.toHaveBeenCalled();
});
it("serves the profile's own image as a non-sniffable JPEG without stale caching", async () => {
  profile(`${id}/picture.jpg`);
  mocks.download.mockResolvedValue({
    data: new Blob(["test image"]),
    error: null,
  });
  const response = await GET(new Request("https://example.com"), {
    params: Promise.resolve({ id }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/jpeg");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
