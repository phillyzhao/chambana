import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseCatalog } from "../scripts/catalog.mjs";
import { catalogSchema } from "../scripts/replace-catalog.mjs";
import temporary from "../missions/temporary-catalog.json";
const valid =
  "Title: Example mission\nCategory: Campus discoveries\nNuts: 20\nInstructions: Photograph outdoor campus art.\nProof: Outdoor artwork clearly visible.";
describe("text mission catalog", () => {
  it("validates all seven temporary challenges with explicit review modes", () => {
    expect(catalogSchema.parse(temporary)).toHaveLength(7);
    expect(temporary.filter((m) => m.manual_review)).toHaveLength(4);
    expect(() => catalogSchema.parse([...temporary, temporary[0]])).toThrow();
  });
  it("parses the supplied template with multiline instructions", async () => {
    const text = await readFile(
      new URL("../missions/mission-catalog.example.txt", import.meta.url),
      "utf8",
    );
    const missions = parseCatalog(text);
    expect(missions).toHaveLength(2);
    expect(missions[0]?.instructions).toContain("Do not approach");
  });
  it("rejects duplicate mission titles within a category", () =>
    expect(() => parseCatalog(`${valid}\n---\n${valid}`)).toThrow("Duplicate"));
  it("rejects invalid reward values and unknown categories", () => {
    expect(() =>
      parseCatalog(valid.replace("Nuts: 20", "Nuts: -10")),
    ).toThrow();
    expect(() =>
      parseCatalog(valid.replace("Campus discoveries", "Anything")),
    ).toThrow();
  });
  it("rejects missing evidence criteria and repeated fields", () => {
    expect(() => parseCatalog(valid.split("\nProof:")[0])).toThrow();
    expect(() => parseCatalog(valid + "\nNuts: 30")).toThrow("duplicate field");
  });
  it("rejects an empty catalog", () =>
    expect(() => parseCatalog("# Nothing yet")).toThrow("no missions"));
});
