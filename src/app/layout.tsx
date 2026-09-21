import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { Navigation } from "@/components/navigation";
import { viewer } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chambana Missions · Go make a memory",
    template: "%s · Chambana",
  },
  description:
    "Small adventures. Shared missions. A little more campus, together. The UIUC-only mobile web beta.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f5",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await viewer();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Brand />
          <Link className="account-link" href={me.user ? "/profile" : "/login"}>
            {me.profile ? me.profile.display_name.split(" ")[0] : "Sign in"}
            <span className="account-dot" />
          </Link>
        </header>
        {me.demo && (
          <div className="preview-banner">
            DESIGN PREVIEW{" "}
            <span>Sample groups & missions · backend connection pending</span>
          </div>
        )}
        <main>{children}</main>
        <footer className="site-footer">
          Made for the space between classes.
          <Link href="/guidelines">Community guidelines & photo privacy</Link>
        </footer>
        <Navigation admin={me.admin} />
      </body>
    </html>
  );
}
