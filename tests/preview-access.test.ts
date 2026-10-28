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
  it("keeps the current desktop screens and the default iPhone preview", () => {
    expect(previewDestination("/design-preview")).toBe("/design-preview");
    expect(previewDestination("/design-preview?view=desktop")).toBe(
      "/design-preview?view=desktop",
    );
    expect(
      previewDestination("/design-preview?view=desktop&screen=missions"),
    ).toBe("/design-preview?view=desktop&screen=missions");
    expect(
      previewDestination("/design-preview?screen=groups&view=desktop#ignored"),
    ).toBe("/design-preview?view=desktop&screen=groups");
    expect(
      previewDestination("/design-preview?screen=inbox&view=desktop#ignored"),
    ).toBe("/design-preview?view=desktop&screen=inbox");
    expect(previewDestination("/design-preview#ignored")).toBe(
      "/design-preview",
    );
  });

  it.each([
    "https://evil.example/login",
    "//evil.example/login",
    "/\\evil.example/login",
    "/login",
    "/login?next=%2Fgroups%3Fmode%3Dmine",
    "/login/other",
    "/login\n",
    "/%2flogin",
    "/missions",
    "/groups/../design-preview",
    "/design-preview/../login",
    "/design-preview?screen=signup&device=iphone-16",
    "/design-preview?view=iphone",
    "/design-preview?view=Desktop",
    "/design-preview?view=desktop&screen=Inbox",
    "/design-preview?screen=inbox",
    "/design-preview?view=desktop&screen=inbox&screen=inbox",
    "/design-preview?view=desktop&screen=inbox&screen=groups",
    "/design-preview?view=desktop&screen=inbox&code=private-code",
    "/design-preview?screen=groups",
    "/design-preview?view=desktop&view=desktop",
    "/design-preview?view=desktop&screen=groups&screen=groups",
    "/design-preview?view=desktop&screen=groups&screen=missions",
    "/design-preview?view=desktop&next=https%3A%2F%2Fevil.example",
    "/design-preview?view=desktop&code=private-code",
    "/design-preview?view=desktop&%63ode=private-code",
    "/design-preview?view=desktop&screen=",
    "/design-preview?view=desktop%0a",
    "/design-preview?" + "x".repeat(2050),
    "javascript:alert(1)",
    null,
  ])("rejects retired, hostile, or ambiguous destination %s", (value) => {
    expect(previewDestination(value)).toBe("/design-preview?view=desktop");
  });
});
