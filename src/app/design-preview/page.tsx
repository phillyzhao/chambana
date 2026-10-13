import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IOSConcepts } from "@/components/ios-concepts";
import { PreviewAccessGate } from "@/components/preview-access-gate";
import { hasPreviewAccess } from "@/lib/preview-access";

export const metadata: Metadata = {
  title: "The Commons · iPhone preview",
  description: "The Commons app and signup flow for Chambana.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DesignPreviewPage() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.CHAMBANA_DESIGN_PREVIEW !== "true"
  ) {
    notFound();
  }

  if (!(await hasPreviewAccess())) {
    return <PreviewAccessGate destination="/design-preview" />;
  }
  return <IOSConcepts />;
}
