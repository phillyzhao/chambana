import { describe, expect, it } from "vitest";
import {
  campusEmail,
  effectiveDecision,
  verdictSchema,
} from "../src/lib/rules";
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
