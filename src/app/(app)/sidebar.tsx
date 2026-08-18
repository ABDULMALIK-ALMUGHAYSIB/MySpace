"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, KanbanSquare, Users, LogOut, Plus } from "lucide-react";
import { initials, avatarColor } from "@/lib/task-meta";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/requesters", label: "Requesters", icon: Users },
];

export default function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex shrink-0 flex-col bg-slate-950 py-6 ${
        collapsed ? "w-20 px-2" : "w-64 px-4"
      }`}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`mb-8 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-900 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          MS
        </div>
        {!collapsed && <span className="text-lg font-semibold text-white">MySpace</span>}
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/board?new=1"
        title={collapsed ? "Add New Task" : undefined}
        className={`mb-4 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700`}
      >
        <Plus size={16} />
        {!collapsed && "Add New Task"}
      </Link>

      <div
        className={`flex items-center gap-3 rounded-lg border-t border-slate-800 pt-4 ${
          collapsed ? "flex-col px-0" : "px-2"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
            userEmail
          )}`}
          title={collapsed ? userName : undefined}
        >
          {initials(userName)}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="truncate text-xs text-slate-400">{userEmail}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
