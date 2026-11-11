import type { Metadata } from "next";
import { MissionAdminLogin } from "@/components/mission-admin";
import { SubmissionReview } from "@/components/submission-review";
import {
  hasMissionAdminAccess,
  missionAdminConfigured,
} from "@/lib/mission-admin-auth";
import {
  listReviewSubmissions,
  MemberMissionError,
} from "@/lib/member-mission-store";

export const metadata: Metadata = {
  title: "Review submissions · Chambana",
  description: "Private proof review and nut approvals.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function SubmissionReviewPage() {
  if (!(await hasMissionAdminAccess()))
    return <MissionAdminLogin configured={missionAdminConfigured()} />;
  try {
    return <SubmissionReview submissions={await listReviewSubmissions()} />;
  } catch (error) {
    return (
      <SubmissionReview
        submissions={[]}
        error={
          error instanceof MemberMissionError
            ? error.message
            : "Submissions are unavailable. Please try again shortly."
        }
      />
    );
  }
}
