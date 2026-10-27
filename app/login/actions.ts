"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and a password of 8+ characters." };
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || parsed.data.email.toLowerCase() !== owner) return { error: "Invalid credentials." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid credentials." };
  redirect("/");
}

export async function requestReset(_: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner && email.toLowerCase() === owner) {
    const supabase = await createClient();
    const h = await headers();
    const origin = h.get("origin") ?? `https://${h.get("host")}`;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback` });
  }
  return { ok: true }; // same response either way: no account enumeration
}
