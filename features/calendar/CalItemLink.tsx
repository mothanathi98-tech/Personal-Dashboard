import Link from "next/link";
import { Dot } from "@/components/ui";
import type { CalItem } from "./queries";

const KIND_LABEL = { deadline: "Due", work: "Work", meeting: "Meeting", review: "Review", followup: "Follow-up" } as const;

export default function CalItemLink({ it, color, compact }: { it: CalItem; color?: string | null; compact?: boolean }) {
  const dotKind = it.kind === "meeting" || it.kind === "followup" ? "meeting" : it.kind === "review" ? "review" : "category";
  const cls = `cal-item ${it.kind === "deadline" ? "deadline" : it.kind === "work" ? "work" : ""} ${it.done ? "done" : ""}`;
  return (
    <Link href={it.href} className={cls} title={`${KIND_LABEL[it.kind]}: ${it.title}`}>
      <Dot kind={dotKind} color={color} />
      {it.time && <span className="muted">{it.time} </span>}{it.title}
      {!compact && <span className="badge" style={{ marginLeft: 6 }}>{KIND_LABEL[it.kind]}</span>}
      {it.overdue && !it.done && <span className="badge overdue" style={{ marginLeft: 6 }}>Overdue</span>}
      {it.done && <span className="badge ok" style={{ marginLeft: 6 }}>Done</span>}
    </Link>
  );
}
