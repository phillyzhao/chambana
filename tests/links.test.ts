import { describe, expect, it } from "vitest";
import { textLinks } from "../src/lib/links";

describe("group description links", () => {
  it("links web addresses while preserving surrounding text", () => {
    const text =
      "Find us at https://example.com/join?q=campus. Or www.example.org!";
    const parts = textLinks(text);
    expect(parts.map((p) => p.text).join("")).toBe(text);
    expect(parts.filter((p) => p.href).map((p) => p.href)).toEqual([
      "https://example.com/join?q=campus",
      "https://www.example.org/",
    ]);
  });
  it("does not turn scripts, HTML, or credential URLs into links", () => {
    expect(
      textLinks(
        "javascript:alert(1) <img src=x onerror=alert(1)> https://user:pass@example.com",
      ).some((p) => p.href),
    ).toBe(false);
  });
});
