import ActionForm from "@/components/ActionForm";
import { Field, PageHeader } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { changePassword, deleteAccount, deleteCategory, savePrefs, saveCategory, saveProfile, sendPasswordReset } from "@/features/settings/actions";

const EXPORTS = ["tasks", "projects", "ideas", "notes", "events", "reviews", "weekly_reviews", "categories"] as const;

export default async function SettingsPage() {
  const { supabase, profile, prefs, categories, user, tz } = await getCtx();
  const { data: jobs } = await supabase.from("reminder_jobs").select("status");
  const stat = (s: string) => (jobs ?? []).filter((j) => j.status === s).length;
  const deletionReady = !!process.env.SUPABASE_SECRET_KEY;
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [tz];
  return (
    <>
      <PageHeader title="Settings" subtitle={user.email ?? ""} />
      <div className="card"><h2>Profile</h2>
        <ActionForm action={saveProfile} submitLabel="Save profile"><div className="fields">
          <Field label="Display name"><input name="display_name" required defaultValue={profile?.display_name ?? ""} /></Field>
          <Field label="Time zone" hint="Used for overdue checks, calendar days and week boundaries."><input name="timezone" list="tzlist" defaultValue={tz} required /><datalist id="tzlist">{zones.map((z) => <option key={z} value={z} />)}</datalist></Field>
        </div></ActionForm></div>
      <div className="card"><h2>Preferences and reminders</h2>
        <ActionForm action={savePrefs} submitLabel="Save preferences"><div className="fields">
          <Field label="Default task priority"><select name="default_task_priority" defaultValue={prefs?.default_task_priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field>
          <Field label="Time format"><select name="time_format" defaultValue={prefs?.time_format}><option value="24h">24-hour</option><option value="12h">12-hour</option></select></Field>
          <Field label="Week starts on"><select name="week_starts_on" defaultValue={prefs?.week_starts_on}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></Field>
          <Field label="Meeting reminder lead (minutes)" hint="0 = only at start time"><input name="default_meeting_lead_minutes" type="number" min={0} defaultValue={prefs?.default_meeting_lead_minutes} /></Field>
          <Field label="Deadline reminder lead (minutes)" hint="1440 = one day before"><input name="default_deadline_lead_minutes" type="number" min={0} defaultValue={prefs?.default_deadline_lead_minutes} /></Field>
          <label className="row"><input type="checkbox" name="email_reminders_enabled" defaultChecked={prefs?.email_reminders_enabled} /> Send email reminders</label>
        </div></ActionForm>
        <p className="small muted">Delivery: {stat("pending")} pending · {stat("sent")} sent · {stat("failed")} failed · {stat("cancelled")} cancelled. Email delivery needs the reminder worker and an email provider key (see docs/REMINDERS.md). In-app notifications work without it.</p>
      </div>
      <div className="card"><h2>Categories</h2>
        <ul className="list">{categories.map((c) => (
          <li key={c.id}><ActionForm action={saveCategory} className="row" submitLabel="Save"><input type="hidden" name="id" value={c.id} /><input name="name" defaultValue={c.name} required aria-label="Category name" style={{ maxWidth: 200 }} /><input name="color" type="color" defaultValue={c.color} aria-label="Colour" style={{ width: 48, padding: 2 }} /></ActionForm>
            <ActionForm action={deleteCategory} inline confirm={`Delete “${c.name}”? Items keep existing but become uncategorised.`}><input type="hidden" name="id" value={c.id} /><button className="btn secondary sm">Delete</button></ActionForm></li>))}</ul>
        <ActionForm action={saveCategory} className="row" resetOnSuccess submitLabel="Add category"><input name="name" placeholder="New category" required aria-label="New category name" style={{ maxWidth: 200 }} /><input name="color" type="color" defaultValue="#22804A" aria-label="Colour" style={{ width: 48, padding: 2 }} /></ActionForm>
      </div>
      <div className="card"><h2>Security</h2>
        <div className="row"><ActionForm action={sendPasswordReset} submitLabel="Email me a password reset link" submitClass="btn secondary" /></div>
        <h3 style={{ marginTop: 16 }}>Change password</h3>
        <ActionForm action={changePassword} resetOnSuccess submitLabel="Change password"><div className="fields"><Field label="New password"><input name="password" type="password" minLength={10} autoComplete="new-password" required /></Field><Field label="Confirm"><input name="confirm" type="password" minLength={10} autoComplete="new-password" required /></Field></div></ActionForm>
      </div>
      <div className="card"><h2>Export your data</h2>
        <p className="muted small">Only your own records are included.</p>
        <div className="row"><a className="btn" href="/export?format=json" download>Download everything (JSON)</a>
          {EXPORTS.map((t) => <a key={t} className="btn secondary sm" href={`/export?format=csv&table=${t}`} download>{t}.csv</a>)}</div>
      </div>
      <div className="card"><h2>Delete account</h2>
        {deletionReady ? (
          <ActionForm action={deleteAccount} confirm="Permanently delete your account and ALL data? This cannot be undone." submitLabel="Delete account and all data" submitClass="btn danger">
            <Field label={`Type ${user.email} to confirm`}><input name="confirm" autoComplete="off" required /></Field></ActionForm>
        ) : <p className="muted">Not available: this deployment has no server-side secret key configured (SUPABASE_SECRET_KEY). See docs/SETUP.md.</p>}
      </div>
    </>
  );
}
