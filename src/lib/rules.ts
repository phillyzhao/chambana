import { z } from "zod";

export const campusEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .refine(
    (email) => email.split("@")[1] === "illinois.edu",
    "Use your @illinois.edu email.",
  );
export const verdictSchema = z.object({
  decision: z.enum(["approved", "rejected", "needs_review"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(600),
  unsafe: z.boolean(),
});
export type Verdict = z.infer<typeof verdictSchema>;
export function effectiveDecision(verdict: Verdict): Verdict["decision"] {
  if (verdict.unsafe || verdict.confidence < 0.9) return "needs_review";
  return verdict.decision;
}
export const groupSchema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().min(10).max(500),
  join_mode: z.enum(["open", "invite", "organization"]),
  organization: z.string().trim().max(120),
  category_ids: z.array(z.string().uuid()).min(1).max(10),
});
export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(240),
});
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PROHIBITED =
  "Illegal activity, alcohol or drugs, harassment, trespassing, dangerous stunts, sexual content, coercion, hazing, and public humiliation are prohibited. Do not approach, feed, chase, or touch wildlife.";
