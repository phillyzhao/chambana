import { notFound, redirect } from "next/navigation";
import { retiredBetaDestination } from "@/lib/site-routes";

export const metadata = { robots: { index: false, follow: false } };

export default async function RetiredBetaPage({
  params,
}: {
  params: Promise<{ legacy: string[] }>;
}) {
  const { legacy } = await params;
  const destination = retiredBetaDestination(`/${legacy.join("/")}`);
  if (!destination) notFound();
  redirect(destination);
}
