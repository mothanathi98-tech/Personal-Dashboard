"use client";
import { useEffect, useRef, useState } from "react";

/** Shows "Unsaved changes" when any field in the surrounding form is edited; warns before leaving the page. */
export default function UnsavedBadge() {
  const ref = useRef<HTMLSpanElement>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const on = () => setDirty(true);
    const off = () => setDirty(false);
    form.addEventListener("input", on);
    form.addEventListener("submit", off);
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    window.addEventListener("beforeunload", warn);
    return () => { form.removeEventListener("input", on); form.removeEventListener("submit", off); window.removeEventListener("beforeunload", warn); };
  }, [dirty]);
  return <span ref={ref} className="small" role="status" style={{ color: dirty ? "var(--white)" : "var(--muted)" }}>{dirty ? "● Unsaved changes" : "All changes saved"}</span>;
}
