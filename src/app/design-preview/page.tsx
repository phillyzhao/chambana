import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IOSConcepts } from "@/components/ios-concepts";
import { DesktopHomePreview } from "@/components/desktop-home-preview";
import { PreviewAccessGate } from "@/components/preview-access-gate";
import { hasPreviewAccess } from "@/lib/preview-access";
import { listPublishedMissions } from "@/lib/mission-library-store";

export const metadata: Metadata = {
  title: "Chambana · design preview",
  description: "Chambana app and signup flow.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string | string[];
    screen?: string | string[];
  }>;
}) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.CHAMBANA_DESIGN_PREVIEW !== "true"
  ) {
    notFound();
  }

  const params = await searchParams;
  const desktop = params.view === "desktop";
  const desktopScreen =
    desktop &&
    (params.screen === "missions" ||
      params.screen === "groups" ||
      params.screen === "inbox" ||
      params.screen === "profile")
      ? params.screen
      : null;
  if (!(await hasPreviewAccess())) {
    return (
      <PreviewAccessGate
        destination={
          desktopScreen
            ? `/design-preview?view=desktop&screen=${desktopScreen}`
            : desktop
              ? "/design-preview?view=desktop"
              : "/design-preview"
        }
      />
    );
  }
  // Drafts never reach either client. Delivery is opt-in and the store also
  // enforces approval, archive state, and the availability window.
  const missionLibrary =
    process.env.CHAMBANA_MISSION_LIBRARY_ENABLED === "true"
      ? await listPublishedMissions()
      : undefined;
  if (desktop) {
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
    return (
      <DesktopHomePreview
        dateLabel={dateLabel}
        missionLibrary={missionLibrary}
      />
    );
  }
  return <IOSConcepts missionLibrary={missionLibrary} />;
}
