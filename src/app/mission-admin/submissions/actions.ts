"use server";

import { revalidatePath } from "next/cache";
import { hasMissionAdminAccess } from "@/lib/mission-admin-auth";
import {
  MemberMissionError,
  reviewSubmission,
} from "@/lib/member-mission-store";
import {
  submissionReviewSchema,
  type MemberSubmission,
} from "@/lib/member-missions";

export type SubmissionReviewFeedback = {
  error?: string;
  submission?: MemberSubmission;
};

export async function decideSubmission(
  _previous: SubmissionReviewFeedback,
  form: FormData,
): Promise<SubmissionReviewFeedback> {
  if (!(await hasMissionAdminAccess()))
    return { error: "Sign in to mission administration to continue." };
  const input = submissionReviewSchema.safeParse({
    id: form.get("id"),
    decision: form.get("decision"),
    reason: form.get("reason") ?? "",
  });
  if (!input.success)
    return {
      error:
        "Choose a decision. Include a reason of up to 1,000 characters when rejecting proof.",
    };
  try {
    const submission = await reviewSubmission(
      input.data.id,
      input.data.decision,
      input.data.reason,
    );
    revalidatePath("/mission-admin/submissions");
    revalidatePath("/app");
    return { submission };
  } catch (error) {
    return {
      error:
        error instanceof MemberMissionError
          ? error.message
          : "Could not save this decision. Refresh the queue and try again.",
    };
  }
}
