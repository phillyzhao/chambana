import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  service: vi.fn(),
  normalize: vi.fn(),
  limit: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  database: mocks.db,
  serviceDatabase: mocks.service,
}));
vi.mock("../src/lib/photos", () => ({ normalizePhoto: mocks.normalize }));
vi.mock("../src/lib/rate-limit", () => ({ allowRequest: mocks.limit }));
vi.mock("../src/lib/email", () => ({ emailConfigured: () => false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(url);
  },
}));
import { mutate } from "../src/app/actions";

const id = "20000000-0000-4000-8000-000000000001";
function form() {
  const result = new FormData();
  result.set("action", "avatar");
  result.set("back", "/profile");
  result.set("user_id", "attacker-controlled-ignored");
  result.set(
    "avatar",
    new File(["test image"], "photo.jpg", { type: "image/jpeg" }),
  );
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue(true);
  mocks.normalize.mockResolvedValue(Buffer.from("normalized jpeg"));
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.save.mockResolvedValue({ error: null });
  mocks.db.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id,
            email: "member@illinois.edu",
            email_confirmed_at: "2026-09-28",
          },
        },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { avatar_path: `${id}/old.jpg` },
            error: null,
          }),
        }),
      }),
    }),
  });
  mocks.service.mockReturnValue({
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    from: () => ({ update: () => ({ eq: mocks.save }) }),
  });
});
it("uses the authenticated profile and normalized image, then removes only the old avatar", async () => {
  await expect(mutate(form())).rejects.toThrow("message=Profile+picture+saved");
  expect(mocks.upload).toHaveBeenCalledWith(
    expect.stringMatching(new RegExp(`^${id}/[a-f0-9-]+\\.jpg$`)),
    Buffer.from("normalized jpeg"),
    { contentType: "image/jpeg", upsert: false },
  );
  expect(mocks.save).toHaveBeenCalledWith("id", id);
  expect(mocks.remove).toHaveBeenCalledWith([`${id}/old.jpg`]);
});
it("removes only the new upload if saving the profile fails", async () => {
  mocks.save.mockResolvedValue({ error: {} });
  await expect(mutate(form())).rejects.toThrow("error=Could+not+update");
  expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  expect(mocks.remove).not.toHaveBeenCalledWith([`${id}/old.jpg`]);
});
it("does not decode or upload images for an unauthenticated request", async () => {
  mocks.db.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  });
  await expect(mutate(form())).rejects.toThrow("error=Sign+in");
  expect(mocks.normalize).not.toHaveBeenCalled();
  expect(mocks.upload).not.toHaveBeenCalled();
});
