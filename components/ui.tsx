import Link from "next/link";
import type { ReactNode } from "react";

/** type: meeting = white dot, review = grey-green dot, category = configured colour. */
export function Dot({ kind = "category", color, label }: { kind?: "meeting" | "review" | "category"; color?: string | null; label?: string }) {
  const cls = kind === "meeting" ? "dot meeting" : kind === "review" ? "dot review" : "dot";
  return <span className={cls} style={kind === "category" && color ? { background: color } : undefined} role="img" aria-label={label ?? kind} />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{subtitle && <p className="muted" style={{ margin: 0 }}>{subtitle}</p>}</div>
      <div className="row">{actions}</div>
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return <div className="empty"><strong style={{ color: "var(--white)" }}>{title}</strong>{hint && <p style={{ margin: "6px 0 0" }}>{hint}</p>}{action && <div style={{ marginTop: 12 }}>{action}</div>}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <span className="small muted">{hint}</span>}</label>;
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return <nav className="tabs" aria-label="Views">{items.map((i) => <Link key={i.key} href={i.href} aria-current={i.key === current ? "page" : undefined}>{i.label}</Link>)}</nav>;
}

export function Progress({ pct }: { pct: number }) {
  return <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% complete`}><span style={{ width: `${pct}%` }} /></div>;
}

export const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", waiting: "Waiting", done: "Done", cancelled: "Cancelled",
  planning: "Planning", active: "Active", on_hold: "On Hold", completed: "Completed", archived: "Archived",
  raw_idea: "Raw Idea", exploring: "Exploring", validating: "Validating", ready_to_build: "Ready to Build", implemented: "Implemented",
  upcoming: "Upcoming", open: "Open",
};
export const label = (s: string) => STATUS_LABEL[s] ?? s;
