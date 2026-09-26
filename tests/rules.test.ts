import { describe, expect, it } from "vitest";
import {
  campusEmail,
  groupSchema,
  effectiveDecision,
  verdictSchema,
} from "../src/lib/rules";
describe("group category selection", () => {
  const group = {
    name: "Campus explorers",
    description: "Discover campus together.",
    join_mode: "open",
    organization: "",
  };
  it("accepts a form with no categories checked", () => {
    const form = new FormData();
    expect(
      groupSchema.parse({ ...group, category_ids: form.getAll("category_ids") })
        .category_ids,
    ).toEqual([]);
  });
  it("still validates selected category IDs and the selection limit", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    expect(
      groupSchema.safeParse({ ...group, category_ids: [id] }).success,
    ).toBe(true);
    for (const ids of [["invalid"], Array(11).fill(id)]) {
      expect(
        groupSchema.safeParse({ ...group, category_ids: ids }).success,
      ).toBe(false);
    }
  });
});
describe("campus account validation", () => {
  it("normalizes an exact Illinois domain", () =>
    expect(campusEmail.parse("  Illini@Illinois.edu ")).toBe(
      "illini@illinois.edu",
    ));
  it.each([
    "person@gmail.com",
    "person@illinois.edu.evil.com",
    "person@sub.illinois.edu",
    "person+illinois.edu@example.com",
    "person@illinoisXedu",
  ])("rejects %s", (email) =>
    expect(campusEmail.safeParse(email).success).toBe(false),
  );
});
describe("photo verdict policy", () => {
  it("accepts high confidence visible evidence", () =>
    expect(
      effectiveDecision({
        decision: "approved",
        confidence: 0.95,
        unsafe: false,
        reason: "Criteria visible",
      }),
    ).toBe("approved"));
  it("routes uncertain and unsafe verdicts to human review", () => {
    expect(
      effectiveDecision({
        decision: "approved",
        confidence: 0.89,
        unsafe: false,
        reason: "Uncertain",
      }),
    ).toBe("needs_review");
    expect(
      effectiveDecision({
        decision: "approved",
        confidence: 1,
        unsafe: true,
        reason: "Unsafe",
      }),
    ).toBe("needs_review");
  });
  it("rejects invalid model responses", () => {
    expect(
      verdictSchema.safeParse({
        decision: "approved",
        confidence: 2,
        unsafe: false,
        reason: "OK",
      }).success,
    ).toBe(false);
    expect(
      verdictSchema.safeParse({
        decision: "approve",
        confidence: 1,
        unsafe: false,
        reason: "OK",
      }).success,
    ).toBe(false);
    expect(verdictSchema.safeParse({ decision: "approved" }).success).toBe(
      false,
    );
  });
});
