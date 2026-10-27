"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { Result } from "@/lib/result";

type Props = {
  action: (fd: FormData) => Promise<Result>;
  children?: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  onSuccess?: (r: Extract<Result, { ok: true }>) => void;
  submitLabel?: string;
  submitClass?: string;
  inline?: boolean;
  id?: string;
};

/**
 * Form wrapper for server actions. Keeps user input on failure, blocks double submits,
 * shows success only after the server confirms, and surfaces errors in place.
 */
export default function ActionForm({ action, children, className, resetOnSuccess, confirm, onSuccess, submitLabel, submitClass = "btn", inline, id }: Props) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const busy = useRef(false);

  return (
    <form
      ref={ref}
      id={id}
      className={className}
      style={inline ? { display: "inline" } : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        if (busy.current) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        busy.current = true;
        start(async () => {
          try {
            const r = await action(fd);
            setResult(r);
            if (r.ok) {
              if (resetOnSuccess) ref.current?.reset();
              onSuccess?.(r);
              if (r.href) router.push(r.href);
            }
          } catch {
            setResult({ ok: false, error: "Something went wrong. Try again." });
          } finally {
            busy.current = false;
          }
        });
      }}
    >
      {children}
      {submitLabel && (
        <button type="submit" className={submitClass} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      )}
      <span role="status" aria-live="polite">
        {result && !result.ok && <p className="err" role="alert">⚠ {result.error}</p>}
        {result && result.ok && result.message && <p className="okmsg">✓ {result.message}</p>}
      </span>
    </form>
  );
}
