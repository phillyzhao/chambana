import Link from "next/link";
import { Brand } from "@/components/ui";
import { Navigation } from "@/components/navigation";
import { AboutMenu } from "@/components/about-menu";
import { viewer } from "@/lib/data";

/** Keep the signed-in community shell independent of the public waitlist. */
export async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await viewer();
  return (
    <>
      <header className="topbar">
        <Brand />
        <div className="header-links">
          <AboutMenu />
          <Link className="account-link" href={me.user ? "/profile" : "/login"}>
            {me.profile ? me.profile.display_name.split(" ")[0] : "Sign in"}
            <span className="account-dot" />
          </Link>
        </div>
      </header>
      {me.demo && (
        <div className="preview-banner">
          DESIGN PREVIEW{" "}
          <span>Sample groups & missions · backend connection pending</span>
        </div>
      )}
      <main>{children}</main>
      <footer className="site-footer">
        Chambana by GateMatch
        <Link href="/guidelines">Community guidelines & photo privacy</Link>
      </footer>
      <Navigation admin={me.admin} />
    </>
  );
}
