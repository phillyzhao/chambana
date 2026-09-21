import { describe, expect, it } from "vitest";
import { safePath, withNotice } from "../src/lib/paths";
describe("internal redirects", () => {
  it("preserves selected group and invitation through actions/sign-in", () => {
    expect(safePath("/missions?group=abc")).toBe("/missions?group=abc");
    expect(safePath("/join?code=ABC")).toBe("/join?code=ABC");
    expect(withNotice("/missions?group=abc", "message", "Saved.")).toBe(
      "/missions?group=abc&message=Saved.",
    );
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/groups/../../api/cron/verify",
    "javascript:alert(1)",
  ])("rejects external or unrelated destination %s", (path) =>
    expect(safePath(path)).toBe("/missions"),
  );
  it("removes unknown and stale notification parameters", () =>
    expect(
      safePath("/groups?q=squirrels&next=https://evil.test&error=old"),
    ).toBe("/groups?q=squirrels"));
});
