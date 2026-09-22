import sharp from "sharp";
import { MAX_PHOTO_BYTES } from "./rules";

export async function normalizePhoto(source: Buffer) {
  if (!source.length || source.length > MAX_PHOTO_BYTES)
    throw new Error("Choose a photo smaller than 8 MB.");
  try {
    const input = sharp(source, { limitInputPixels: 25000000 });
    const metadata = await input.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) > 1
    )
      throw new Error("Unsupported image");
    return await input
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error(
      "That image could not be read. Choose a valid, still JPG, PNG, or WebP photo.",
    );
  }
}
