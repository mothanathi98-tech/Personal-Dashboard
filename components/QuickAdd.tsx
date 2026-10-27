"use client";
import { useEffect, useRef, useState } from "react";
import ActionForm from "./ActionForm";
import type { Result } from "@/lib/result";

type Cat = { id: string; name: string };
const TYPES = [["task", "Task"], ["project", "Project"], ["idea", "Idea"], ["note", "Note"], ["meeting", "Meeting"], ["review", "Review"]] as const;

export function QuickAddButton({ type, children, className = "btn sm" }: { type?: string; children: React.ReactNode; className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent("quickadd", { detail: { type } }))}>{children}</button>;
}

export default function QuickAdd({ categories, action }: { categories: Cat[]; action: (fd: FormData) => Promise<Result> }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<string>("task");
  useEffect(() => {
    const open = (e: Event) => { const t = (e as CustomEvent).detail?.type; if (t) setType(t); dlg.current?.showModal(); };
    const key = (e: KeyboardEvent) => { if (e.key === "q" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); dlg.current?.showModal(); } };
    window.addEventListener("quickadd", open); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("quickadd", open); window.removeEventListener("keydown", key); };
  }, []);
  return (
    <>
      <button type="button" className="btn fab" onClick={() => dlg.current?.showModal()} aria-label="Quick add">＋ Quick add</button>
      <dialog ref={dlg} aria-labelledby="qa-title">
        <div className="row between"><h2 id="qa-title" style={{ margin: 0 }}>Quick add</h2><button type="button" className="btn secondary sm" onClick={() => dlg.current?.close()}>Close</button></div>
        <ActionForm action={action} className="stack" resetOnSuccess submitLabel="Add">
          <div className="tabs" role="radiogroup" aria-label="Item type">
            {TYPES.map(([k, l]) => <label key={k} className={`btn sm ${type === k ? "" : "secondary"}`} style={{ cursor: "pointer" }}><input type="radio" name="type" value={k} checked={type === k} onChange={() => setType(k)} style={{ position: "absolute", opacity: 0, width: 0 }} />{l}</label>)}
          </div>
          <label className="field"><span>{type === "project" ? "Name" : "Title"}</span><input name="title" required maxLength={300} autoFocus /></label>
          <div className="fields">
            <label className="field"><span>Category</span><select name="category_id" defaultValue=""><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            {(type === "task" || type === "meeting") && <label className="field"><span>{type === "task" ? "Due (optional)" : "Starts"}</span><input name="when" type="datetime-local" required={type === "meeting"} /></label>}
            {type === "review" && <label className="field"><span>Review date (optional)</span><input name="date" type="date" /></label>}
          </div>
          <label className="field"><span>Details (optional)</span><textarea name="details" style={{ minHeight: 70 }} /></label>
        </ActionForm>
      </dialog>
    </>
  );
}
