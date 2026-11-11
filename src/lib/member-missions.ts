import { z } from "zod";

export const PROOF_BUCKET = "member-mission-proof";
export const PHOTO_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 50 * 1024 * 1024;
export const PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const proofUploadSchema = z
  .object({
    missionId: z.uuid(),
    mime: z.enum(PROOF_TYPES),
    size: z.number().int().positive().max(VIDEO_LIMIT),
  })
  .refine(
    (value) => !value.mime.startsWith("image/") || value.size <= PHOTO_LIMIT,
    {
      message:
        "Photos must be 10 MB or smaller. Videos must be 50 MB or smaller.",
    },
  );

export const submissionReviewSchema = z
  .object({
    id: z.uuid(),
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(1000).default(""),
  })
  .refine((value) => value.decision !== "reject" || value.reason.length > 0, {
    message: "Add a reason so the member knows what to try again.",
  });

export type MemberSubmission = {
  id: string;
  user_id: string;
  mission_id: string;
  status: "uploading" | "pending" | "approved" | "rejected";
  mission_title: string;
  mission_instructions: string;
  proof_prompt: string;
  nuts: number;
  mission_revision: number;
  proof_path: string;
  mime_type: (typeof PROOF_TYPES)[number];
  size_bytes: number;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

export type ReviewSubmission = MemberSubmission & {
  member_name: string;
  member_handle: string;
};

export type MemberMissionState = {
  submissions: MemberSubmission[];
  nuts: number;
  completedCount: number;
};

/** Check the file signature as well as the browser's declared media type. */
export function proofHeaderMatches(bytes: Uint8Array, mime: string) {
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    );
  if (mime === "image/webp")
    return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (mime === "video/webm")
    return (
      [0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => bytes[index] === byte) &&
      text(0, Math.min(bytes.length, 512)).includes("webm")
    );
  if (mime === "video/mp4" || mime === "video/quicktime") {
    // ISO base media containers put their file type box first. Old QuickTime
    // files without a file type box are intentionally rejected with a retry.
    if (text(4, 8) !== "ftyp" || bytes.length < 16) return false;
    const size = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).getUint32(0);
    if (size < 16 || size > bytes.length) return false;
    const brands = [text(8, 12)];
    for (let offset = 16; offset + 4 <= size; offset += 4)
      brands.push(text(offset, offset + 4));
    return mime === "video/quicktime"
      ? brands.includes("qt  ")
      : brands.some((brand) =>
          /^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV)$/.test(brand),
        );
  }
  return false;
}
