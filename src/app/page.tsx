import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";
import { WaitlistIntro } from "@/components/waitlist-intro";
import styles from "@/components/waitlist.module.css";

export const metadata: Metadata = {
  title: "Chambana · Bringing Chambana together.",
  description:
    "Bringing Chambana together. Join the Chambana waitlist at Illinois.",
};
export const viewport: Viewport = { themeColor: "#171717" };

export default function Home() {
  return (
    <div className={styles.page}>
      <Image
        src="/design-assets/lounge.jpg"
        alt=""
        fill
        unoptimized
        sizes="100vw"
        loading="eager"
        className={styles.roomImage}
      />
      <div className={styles.atmosphere} aria-hidden="true" />
      <a className={styles.skip} href="#waitlist">
        Skip to waitlist
      </a>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Chambana home">
          chambana.
        </Link>
        <span className={styles.headerNote}>EARLY ACCESS</span>
      </header>
      <main className={styles.main}>
        <section className={styles.content} aria-labelledby="waitlist-title">
          <WaitlistIntro />
          <div id="waitlist" className={styles.formArea}>
            <WaitlistForm />
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>CHAMPAIGN–URBANA</span>
        <Link href="/login">
          Member sign in <ArrowUpRight size={12} />
        </Link>
      </footer>
      {process.env.NODE_ENV === "development" && (
        <Link className={styles.previewLink} href="/design-preview">
          iOS concepts <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}
