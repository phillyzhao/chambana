import sharp from "sharp";
import { describe, it, expect } from "vitest";
import { normalizePhoto } from "../src/lib/photos";
describe("photo boundary", () => {
  it("normalizes valid photos and strips metadata", async () => {
    const input = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: "red" },
    })
      .withMetadata()
      .jpeg()
      .toBuffer();
    const output = await normalizePhoto(input);
    const info = await sharp(output).metadata();
    expect(info.format).toBe("jpeg");
    expect(info.width).toBe(1600);
    expect(info.exif).toBeUndefined();
    expect(info.icc).toBeUndefined();
  });
  it("rejects empty, corrupt, oversized and disguised SVG content", async () => {
    for (const input of [
      Buffer.alloc(0),
      Buffer.from("not jpeg"),
      Buffer.alloc(8 * 1024 * 1024 + 1),
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      ),
    ])
      await expect(normalizePhoto(input)).rejects.toThrow();
  });
});
