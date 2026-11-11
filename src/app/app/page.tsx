import type { Metadata } from "next";
import { IOSConcepts } from "@/components/ios-concepts";
import { DesktopHomePreview } from "@/components/desktop-home-preview";
import { getMemberAccount } from "@/lib/member-auth";
import { getMemberMissionState } from "@/lib/member-mission-store";
import { listPublishedMissions } from "@/lib/mission-library-store";
import { hasPreviewAccess } from "@/lib/preview-access";
import { PreviewAccessGate } from "@/components/preview-access-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Missions · Chambana",
  robots: { index: false, follow: false },
};

export default async function MemberAppPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; auth_error?: string }>;
}) {
  const params = await searchParams;
  if (!(await hasPreviewAccess()))
    return <PreviewAccessGate destination="/app" />;
  const account = await getMemberAccount();
  if (!account?.profile)
    return (
      <IOSConcepts
        realAccount
        verifiedEmail={account?.email}
        initialError={
          params.auth_error
            ? "That sign-in link could not be verified. Request a new one."
            : undefined
        }
      />
    );
  const [missionLibrary, state] = await Promise.all([
    process.env.CHAMBANA_MISSION_LIBRARY_ENABLED === "true"
      ? listPublishedMissions()
      : Promise.resolve({ missions: [] }),
    getMemberMissionState(account.id),
  ]);
  const member = { ...state, id: account.id, profile: account.profile };
  if (params.view === "desktop")
    return (
      <DesktopHomePreview
        dateLabel={new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          dateStyle: "full",
        }).format(new Date())}
        missionLibrary={missionLibrary}
        member={member}
      />
    );
  return (
    <IOSConcepts realAccount member={member} missionLibrary={missionLibrary} />
  );
}
