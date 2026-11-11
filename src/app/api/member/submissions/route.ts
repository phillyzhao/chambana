import { z } from "zod";
import { requireMemberAccount } from "@/lib/member-auth";
import {
  reserveSubmission,
  MemberMissionError,
} from "@/lib/member-mission-store";
import {
  privateJson,
  readSubmissionBody,
  submissionErrorResponse,
} from "@/lib/member-submission-http";

const inputSchema = z
  .object({
    missionId: z.string().uuid(),
    mime: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ]),
    size: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
  })
  .strict()
  .refine(
    (input) =>
      !input.mime.startsWith("image/") || input.size <= 10 * 1024 * 1024,
  );

export async function POST(request: Request) {
  try {
    const account = await requireMemberAccount({ profile: true });
    const input = inputSchema.safeParse(await readSubmissionBody(request));
    if (!input.success)
      throw new MemberMissionError(
        400,
        "Choose a photo up to 10 MB or a video up to 50 MB.",
      );
    const reservation = await reserveSubmission(
      account.id,
      input.data.missionId,
      input.data.mime,
      input.data.size,
    );
    return privateJson(reservation, 201);
  } catch (error) {
    return submissionErrorResponse(error);
  }
}
