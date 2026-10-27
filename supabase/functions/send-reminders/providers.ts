// Small email-provider abstraction. Swap providers by changing getProvider() only.
export class SendError extends Error {
  constructor(message: string, public retry: boolean) { super(message); }
}

export interface EmailProvider {
  name: string;
  send(m: { to: string; subject: string; text: string }): Promise<{ id: string | null }>;
}

const resend = (apiKey: string, from: string): EmailProvider => ({
  name: "resend",
  async send(m) {
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text }),
      });
    } catch {
      throw new SendError("network error", true);
    }
    if (res.ok) return { id: ((await res.json()) as { id?: string }).id ?? null };
    throw new SendError(`provider status ${res.status}`, res.status === 429 || res.status >= 500);
  },
});

const dryRun: EmailProvider = { name: "dry-run", send: () => Promise.resolve({ id: "dry-run" }) };

/** null = email not configured (email jobs are left pending, in-app reminders still run). */
export function getProvider(): EmailProvider | null {
  if (Deno.env.get("REMINDER_DRY_RUN") === "true") return dryRun;
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REMINDER_FROM_EMAIL");
  return key && from ? resend(key, from) : null;
}
