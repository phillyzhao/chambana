import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  database: vi.fn(),
  in: vi.fn(),
}));
vi.mock("../src/lib/data", async (original) => ({
  ...(await original<typeof import("../src/lib/data")>()),
  viewer: mocks.viewer,
}));
vi.mock("../src/lib/supabase", () => ({ database: mocks.database }));
vi.mock("../src/app/actions", () => ({ mutate: vi.fn() }));
import Groups from "../src/app/groups/page";

beforeEach(() => {
  mocks.in.mockClear();
  mocks.viewer.mockResolvedValue({
    user: { id: "viewer" },
    demo: false,
    organizer: false,
  });
  mocks.database.mockResolvedValue({
    from: (table: string) => {
      const result = () => ({
        error: null,
        data: {
          group_members: [{ group_id: "member" }],
          categories: [],
          groups: [
            {
              id: "public",
              name: "Public explorers",
              description: "Campus adventures",
              join_mode: "open",
            },
            {
              id: "org",
              name: "Campus organization",
              description: "Campus adventures",
              join_mode: "organization",
            },
            {
              id: "member",
              name: "Private friends",
              description: "Campus adventures",
              join_mode: "invite",
            },
            {
              id: "other",
              name: "Other invite group",
              description: "Other adventures",
              join_mode: "invite",
            },
          ],
        }[table],
      });
      const query = {
        select: () => query,
        eq: () => query,
        in: (column: string, values: string[]) => {
          mocks.in(column, values);
          return query;
        },
        order: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
    rpc: async () => ({ error: null, data: [] }),
  });
});

async function render(mode: string | string[], q = "") {
  return renderToStaticMarkup(
    await Groups({ searchParams: Promise.resolve({ mode, q }) }),
  );
}

it("queries and renders both selected types and preserves the filter in search", async () => {
  const html = await render("open,organization");
  expect(mocks.in).toHaveBeenCalledWith("join_mode", ["open", "organization"]);
  expect(html).toContain("Public explorers");
  expect(html).toContain("Campus organization");
  expect(html).not.toContain("Private friends");
  expect(html).toContain('name="mode" value="open,organization"');
});

it("adds member groups to public groups when My groups is combined with a type", async () => {
  const html = await render("open,mine");
  expect(mocks.in).not.toHaveBeenCalled();
  expect(html).toContain("Public explorers");
  expect(html).toContain("Private friends");
  expect(html).not.toContain("Other invite group");
  expect(html).not.toContain("Campus organization");
});

it("still narrows My groups alone by membership", async () => {
  const html = await render("mine");
  expect(mocks.in).toHaveBeenCalledWith("id", ["member"]);
  expect(html).toContain("Private friends");
  expect(html).not.toContain("Public explorers");
});

it("supports repeated URL modes and searches within their combined results", async () => {
  const html = await render(["open", "organization"], "organization");
  expect(html).toContain("Campus organization");
  expect(html).not.toContain("Public explorers");
  expect(html).toContain('name="mode" value="open,organization"');
});
