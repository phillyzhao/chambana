import Link from "next/link";
import { ArrowUpRight, ArrowRight, Sprout, Users, Compass } from "lucide-react";
import { mutate } from "@/app/actions";
import type { Group } from "@/lib/data";

export function Brand() {
  return (
    <Link href="/missions" className="brand">
      <span className="brand-mark">
        <Sprout size={22} />
      </span>
      chambana<span className="beta">BETA</span>
    </Link>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="intro-copy">{children}</p>}
    </div>
  );
}
export function Notice({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  return (
    <>
      {params.error && (
        <div className="notice error" role="alert">
          {params.error}
        </div>
      )}
      {params.message && (
        <div className="notice" role="status">
          {params.message}
        </div>
      )}
    </>
  );
}
export function Action({
  kind,
  back,
  fields = {},
  children,
  className = "",
}: {
  kind: string;
  back: string;
  fields?: Record<string, string>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={mutate} className={className}>
      <input type="hidden" name="action" value={kind} />
      <input type="hidden" name="back" value={back} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
    </form>
  );
}
export function Empty({
  title,
  children,
  link,
  label,
}: {
  title: string;
  children: React.ReactNode;
  link?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Compass size={30} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {link && (
        <Link className="button" href={link}>
          {label}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function GroupCard({
  group,
  index = 0,
}: {
  group: Group;
  index?: number;
}) {
  return (
    <Link href={`/groups/${group.id}`} className="group-card">
      <span className={`group-avatar tone-${index % 3}`}>
        <Users size={26} />
      </span>
      <div>
        <span className="small-label">
          {group.join_mode === "open"
            ? "OPEN GROUP"
            : group.join_mode === "invite"
              ? "INVITE ONLY"
              : "CAMPUS ORGANIZATION"}
        </span>
        <h2>{group.name}</h2>
        <p>{group.description}</p>
        <span className="text-link">
          Explore group <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}
export function ReportForm({
  type,
  id,
  back,
}: {
  type: string;
  id: string;
  back: string;
}) {
  return (
    <details className="report">
      <summary>Report this {type}</summary>
      <Action
        kind="report"
        back={back}
        fields={{ target_type: type, target_id: id }}
      >
        <label>
          What should we review?
          <textarea name="reason" required minLength={10} maxLength={1000} />
        </label>
        <button className="button secondary">Send report</button>
      </Action>
    </details>
  );
}
