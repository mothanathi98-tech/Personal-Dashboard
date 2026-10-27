import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TZ } from "@/lib/dates";

/** Server-side gate: user must be signed in AND match OWNER_EMAIL. Cached per request. */
export const requireOwner = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!user || !owner || user.email?.toLowerCase() !== owner) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  return { supabase, user };
});

/** Owner + profile, preferences and categories (the context almost every page needs). */
export const getCtx = cache(async () => {
  const { supabase, user } = await requireOwner();
  const [profile, prefs, cats] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
    supabase.from("categories").select("*").order("name"),
  ]);
  return {
    supabase,
    user,
    profile: profile.data,
    prefs: prefs.data,
    tz: profile.data?.timezone ?? DEFAULT_TZ,
    categories: cats.data ?? [],
  };
});
