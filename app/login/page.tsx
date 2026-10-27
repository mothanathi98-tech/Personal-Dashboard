"use client";
import { useActionState } from "react";
import { login, requestReset } from "./actions";
import s from "./login.module.css";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [reset, resetAction, resetPending] = useActionState(requestReset, undefined);
  return (
    <main className={s.wrap}>
      <form action={action} className={s.card}>
        <h1>Command Centre</h1>
        <p className={s.muted}>Private. Owner sign-in only.</p>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        {state?.error && <p role="alert" className={s.error}>⚠ {state.error}</p>}
        <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
      <form action={resetAction} className={s.card}>
        <label htmlFor="reset-email">Forgot password? Email a reset link</label>
        <input id="reset-email" name="email" type="email" required />
        {reset?.ok && <p role="status" className={s.muted}>If that is the owner email, a reset link is on its way.</p>}
        <button type="submit" disabled={resetPending}>{resetPending ? "Sending…" : "Send reset link"}</button>
      </form>
    </main>
  );
}
