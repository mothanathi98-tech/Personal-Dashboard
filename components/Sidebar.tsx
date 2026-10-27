"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV } from "./nav-items";
import s from "./Sidebar.module.css";

export default function Sidebar({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <header className={s.topbar}>
        <button aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}>☰</button>
        <strong>Command Centre</strong>
      </header>
      {open && <div className={s.scrim} onClick={() => setOpen(false)} />}
      <aside className={`${s.side} ${collapsed ? s.collapsed : ""} ${open ? s.open : ""}`} aria-label="Primary">
        <div className={s.head}>
          {!collapsed && <strong>Command Centre</strong>}
          <button className={s.ghost} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "»" : "«"}
          </button>
        </div>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active(n.href) ? "page" : undefined} className={active(n.href) ? s.active : ""}>
              <span aria-hidden className={s.pip}>{n.label[0]}</span>
              {!collapsed && <span>{n.label}</span>}
              {n.href === "/notifications" && unread > 0 && <span className="badge overdue" aria-label={`${unread} unread`}>{unread}</span>}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post"><button className={s.ghost} type="submit">{collapsed ? "⎋" : "Sign out"}</button></form>
      </aside>
    </>
  );
}
