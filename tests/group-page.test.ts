import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ viewer: vi.fn(), database: vi.fn() }));
vi.mock("../src/lib/data", async (original) => ({
  ...(await original<typeof import("../src/lib/data")>()),
  viewer: mocks.viewer,
}));
vi.mock("../src/lib/supabase", () => ({ database: mocks.database }));
vi.mock("../src/app/actions", () => ({ mutate: vi.fn() }));
import GroupPage from "../src/app/groups/[id]/page";

let ownerId: string;
let mode: string;
let selected: { category_id: string }[];
let membership: string;
const category = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  ownerId = "owner";
  mode = "open";
  selected = [{ category_id: category }];
  membership = "active";
  mocks.viewer.mockResolvedValue({
    user: { id: "owner" },
    organizer: true,
    admin: false,
    demo: false,
  });
  mocks.database.mockResolvedValue({
    from: (table: string) => {
      let pending = false;
      const result = () => ({
        error: null,
        data: {
          groups: {
            id: "group",
            name: "Test group",
            description: "Explore campus together.",
            owner_id: ownerId,
            join_mode: mode,
            organization_verified: true,
          },
          categories: [{ id: category, name: "Campus discoveries" }],
          group_categories: selected,
          group_leaderboard: { nuts: 0 },
          group_members: pending
            ? []
            : membership
              ? { status: membership }
              : null,
          assignments: [],
        }[table],
      });
      const query = {
        select: () => query,
        eq: (key: string, val: string) => {
          if (key === "status" && val === "pending") pending = true;
          return query;
        },
        order: () => query,
        single: async () => result(),
        maybeSingle: async () => result(),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
    rpc: async (name: string) => ({
      error: null,
      data: name === "group_member_counts" ? [{ member_count: 2 }] : [],
    }),
  });
});
async function render() {
  return renderToStaticMarkup(
    await GroupPage({
      params: Promise.resolve({ id: "group" }),
      searchParams: Promise.resolve({}),
    }),
  );
}
it.each(["open", "invite", "organization"])(
  "shows selected categories and owner editing for %s groups",
  async (joinMode) => {
    mode = joinMode;
    const html = await render();
    expect(html).toContain("Campus discoveries");
    expect(html).toContain("Save categories");
    expect(html).toContain('checked=""');
    expect(html.includes("Join requests")).toBe(mode === "organization");
    expect(html).not.toContain("Report this group");
  },
);
it("moves reporting and category editing to the correct people after a transfer", async () => {
  ownerId = "successor";
  const formerOwner = await render();
  expect(formerOwner).toContain("Report this group");
  expect(formerOwner).not.toContain("Save categories");
  mocks.viewer.mockResolvedValue({
    user: { id: "successor" },
    organizer: true,
    admin: false,
    demo: false,
  });
  const newOwner = await render();
  expect(newOwner).not.toContain("Report this group");
  expect(newOwner).toContain("Save categories");
});
it.each(["", "pending"])(
  "keeps categories visible but hides reporting for membership %s",
  async (status) => {
    membership = status;
    mocks.viewer.mockResolvedValue({
      user: { id: "outsider" },
      organizer: false,
      admin: false,
      demo: false,
    });
    const html = await render();
    expect(html).toContain("Campus discoveries");
    expect(html).not.toContain("Report this group");
    expect(html).not.toContain("Save categories");
  },
);
it("shows all categories when the selection is empty and hides reporting from a revoked organizer owner", async () => {
  selected = [];
  mocks.viewer.mockResolvedValue({
    user: { id: "owner" },
    organizer: false,
    admin: false,
    demo: false,
  });
  const html = await render();
  expect(html).toContain("All categories");
  expect(html).not.toContain("Report this group");
  expect(html).not.toContain("Save categories");
});
