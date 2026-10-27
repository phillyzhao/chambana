import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IOSConcepts } from "@/components/ios-concepts";
import { DesktopHomePreview } from "@/components/desktop-home-preview";
import { PreviewAccessGate } from "@/components/preview-access-gate";
import { hasPreviewAccess } from "@/lib/preview-access";

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
  const missions = desktop && params.screen === "missions";
  if (!(await hasPreviewAccess())) {
    return (
      <PreviewAccessGate
        destination={
          missions
            ? "/design-preview?view=desktop&screen=missions"
            : desktop
              ? "/design-preview?view=desktop"
              : "/design-preview"
        }
      />
    );
  }
  if (desktop) {
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
    return <DesktopHomePreview dateLabel={dateLabel} />;
  }
  return <IOSConcepts />;
}
