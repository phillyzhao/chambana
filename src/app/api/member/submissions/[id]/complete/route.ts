import { z } from "zod";
import { requireMemberAccount } from "@/lib/member-auth";
import {
  finalizeSubmission,
  MemberMissionError,
} from "@/lib/member-mission-store";
import {
  privateJson,
  readSubmissionBody,
  submissionErrorResponse,
} from "@/lib/member-submission-http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const account = await requireMemberAccount({ profile: true });
    const { id } = await context.params;
    if (
      !z.string().uuid().safeParse(id).success ||
      !z
        .object({})
        .strict()
        .safeParse(await readSubmissionBody(request)).success
    )
      throw new MemberMissionError(
        400,
        "This submission is invalid. Refresh and try again.",
      );
    return privateJson({
      submission: await finalizeSubmission(account.id, id),
    });
  } catch (error) {
    return submissionErrorResponse(error);
  }
}
