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
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.CHAMBANA_DESIGN_PREVIEW !== "true"
  ) {
    notFound();
  }

  const desktop = (await searchParams).view === "desktop";
  if (!(await hasPreviewAccess())) {
    return (
      <PreviewAccessGate
        destination={
          desktop ? "/design-preview?view=desktop" : "/design-preview"
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
