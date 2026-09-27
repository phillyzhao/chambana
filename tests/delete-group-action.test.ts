import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  rpc: vi.fn(),
  rateLimit: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({ database: mocks.db }));
vi.mock("../src/lib/rate-limit", () => ({ allowRequest: mocks.rateLimit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(url);
  },
}));
import { mutate } from "../src/app/actions";

const id = "30000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue(true);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.db.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "owner",
            email: "owner@illinois.edu",
            email_confirmed_at: "2026-09-26",
          },
        },
      }),
    },
    rpc: mocks.rpc,
  });
});
function form(confirmation = "Test group") {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    action: "delete_group",
    group_id: id,
    back: `/groups/${id}`,
    confirmation,
  }))
    data.set(key, value);
  return data;
}
it("passes the typed name unchanged to the authorized RPC and redirects to groups", async () => {
  await expect(mutate(form())).rejects.toThrow("/groups?message=Group+deleted");
  expect(mocks.rpc).toHaveBeenCalledWith("delete_group", {
    p_group: id,
    p_confirmation: "Test group",
  });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
it("shows database confirmation failures on the group page without claiming deletion", async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { message: "Enter the exact group name to confirm deletion." },
  });
  await expect(mutate(form("Test group "))).rejects.toThrow(
    `/groups/${id}?error=Enter+the+exact+group+name`,
  );
  expect(mocks.rpc).toHaveBeenCalledWith("delete_group", {
    p_group: id,
    p_confirmation: "Test group ",
  });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("never invokes deletion without a verified campus session", async () => {
  mocks.db.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
    rpc: mocks.rpc,
  });
  await expect(mutate(form())).rejects.toThrow("error=Sign+in");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
