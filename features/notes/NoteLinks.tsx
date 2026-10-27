import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { addNoteLink, removeNoteLink } from "./actions";

type Item = { id: string; title: string };
const HREF = { task: "/tasks", idea: "/brainstorm", event: "/meetings" } as const;

export default function NoteLinks({ noteId, kind, linked, candidates, heading }: { noteId: string; kind: "task" | "idea" | "event"; linked: Item[]; candidates: Item[]; heading: string }) {
  const have = new Set(linked.map((l) => l.id));
  const options = candidates.filter((c) => !have.has(c.id));
  return (
    <div className="card">
      <h3>{heading}</h3>
      {linked.length === 0 ? <p className="muted small">None linked.</p> : (
        <ul className="list">{linked.map((l) => (
          <li key={l.id}><Link className="plain" href={`${HREF[kind]}/${l.id}`}>{l.title}</Link>
            <ActionForm action={removeNoteLink} inline><input type="hidden" name="note_id" value={noteId} /><input type="hidden" name="target_id" value={l.id} /><input type="hidden" name="kind" value={kind} /><button className="btn secondary sm">Unlink</button></ActionForm></li>
        ))}</ul>
      )}
      {options.length > 0 && (
        <ActionForm action={addNoteLink} className="row">
          <input type="hidden" name="note_id" value={noteId} /><input type="hidden" name="kind" value={kind} />
          <select name="target_id" aria-label={`Link ${kind}`} style={{ maxWidth: 260 }}>{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select>
          <button className="btn sm">Link</button>
        </ActionForm>
      )}
    </div>
  );
}
