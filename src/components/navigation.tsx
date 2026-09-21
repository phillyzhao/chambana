"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, Trophy, UserRound, ShieldCheck } from "lucide-react";
export function Navigation({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/missions", name: "Missions", icon: Compass },
    { href: "/groups", name: "Groups", icon: Users },
    { href: "/leaderboard", name: "Leaderboard", icon: Trophy },
    { href: "/profile", name: "You", icon: UserRound },
    ...(admin ? [{ href: "/admin", name: "Admin", icon: ShieldCheck }] : []),
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ href, name, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path.startsWith(href) ? "page" : undefined}
        >
          <Icon size={21} />
          {name}
        </Link>
      ))}
    </nav>
  );
}
