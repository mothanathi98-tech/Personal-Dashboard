import QuickAdd from "@/components/QuickAdd";
import Sidebar from "@/components/Sidebar";
import { getCtx } from "@/lib/permissions/owner";
import { quickAdd } from "@/features/quickadd/actions";
import s from "./shell.module.css";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { categories, supabase } = await getCtx();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).is("dismissed_at", null);
  return (
    <div className={s.shell}>
      <Sidebar unread={count ?? 0} />
      <main className={s.main} id="main">{children}</main>
      <QuickAdd categories={categories.map((c) => ({ id: c.id, name: c.name }))} action={quickAdd} />
    </div>
  );
}
