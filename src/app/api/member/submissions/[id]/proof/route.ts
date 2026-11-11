import { z } from "zod";
import { requireMemberAccount } from "@/lib/member-auth";
import { hasMissionAdminAccess } from "@/lib/mission-admin-auth";
import { getProofUrl, MemberMissionError } from "@/lib/member-mission-store";
import {
  privateJson,
  submissionErrorResponse,
} from "@/lib/member-submission-http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = (await hasMissionAdminAccess())
      ? null
      : (await requireMemberAccount({ profile: true })).id;
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success)
      throw new MemberMissionError(400, "This submission is invalid.");
    return privateJson({ url: await getProofUrl(userId, id) });
  } catch (error) {
    return submissionErrorResponse(error);
  }
}
