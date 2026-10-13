import { describe, expect, it } from "vitest";
import {
  createPreviewToken,
  PREVIEW_ACCESS_MAX_AGE,
  previewDestination,
  validPreviewCode,
  verifyPreviewToken,
} from "../src/lib/preview-access-token";

const secret = "a-test-signing-secret-that-is-long-enough";
const now = Date.parse("2026-10-12T12:00:00Z");

describe("shared preview access", () => {
  it("requires the complete code, including the leading zeroes", () => {
    expect(validPreviewCode("0010110")).toBe(true);
    expect(validPreviewCode("10110")).toBe(false);
    expect(validPreviewCode("0010111")).toBe(false);
    expect(validPreviewCode(null)).toBe(false);
    expect(validPreviewCode(new File(["0010110"], "code"))).toBe(false);
  });

  it("accepts a freshly signed token without revealing the code", () => {
    const token = createPreviewToken(secret, now);
    expect(verifyPreviewToken(token, secret, now)).toBe(true);
    expect(verifyPreviewToken(token, secret, now + 60_000)).toBe(true);
    expect(token).not.toContain("0010110");
    expect(createPreviewToken(secret, now)).not.toBe(token);
  });

  it("rejects forged signatures, altered expiry, and rotated keys", () => {
    const token = createPreviewToken(secret, now);
    const parts = token.split(".");
    parts[1] = String(Number(parts[1]) + 1);
    expect(verifyPreviewToken(parts.join("."), secret, now + 1000)).toBe(false);
    expect(verifyPreviewToken(token.slice(0, -1) + "z", secret, now)).toBe(
      false,
    );
    expect(
      verifyPreviewToken(token, "a-different-long-secret-for-this-test", now),
    ).toBe(false);
  });

  it("rejects expired tokens and tokens issued in the future", () => {
    const token = createPreviewToken(secret, now);
    expect(
      verifyPreviewToken(token, secret, now + PREVIEW_ACCESS_MAX_AGE * 1000),
    ).toBe(false);
    expect(verifyPreviewToken(token, secret, now - 1000)).toBe(false);
  });

  it("fails closed for missing configuration and malformed cookies", () => {
    const token = createPreviewToken(secret, now);
    expect(verifyPreviewToken(token, undefined, now)).toBe(false);
    expect(verifyPreviewToken(token, "too-short", now)).toBe(false);
    expect(() => createPreviewToken("short", now)).toThrow("not configured");
    for (const value of [
      undefined,
      "0010110",
      "true",
      `${token}.extra`,
      "x".repeat(1000),
    ])
      expect(verifyPreviewToken(value, secret, now)).toBe(false);
  });
});

describe("preview return destinations", () => {
  it("preserves query strings on the exact permitted pages", () => {
    expect(
      previewDestination("/design-preview?screen=signup&device=iphone-16"),
    ).toBe("/design-preview?screen=signup&device=iphone-16");
    expect(previewDestination("/login?next=%2Fgroups%3Fmode%3Dmine")).toBe(
      "/login?next=%2Fgroups%3Fmode%3Dmine",
    );
    expect(previewDestination("/design-preview#ignored")).toBe(
      "/design-preview",
    );
  });

  it("rejects external URLs, confusing paths, and unrelated routes", () => {
    for (const value of [
      "https://evil.example/login",
      "//evil.example/login",
      "/\\evil.example/login",
      "/login/other",
      "/login\n",
      "/%2flogin",
      "/missions",
      "javascript:alert(1)",
      null,
    ])
      expect(previewDestination(value)).toBe("/design-preview");
  });
});
