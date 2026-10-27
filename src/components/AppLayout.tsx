import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/context/AuthProvider";

export default function AppLayout() {
  const { user } = useAuth();
  const userName = (user?.user_metadata?.name as string | undefined) ?? "User";
  const userEmail = user?.email ?? "";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-semibold text-slate-900 dark:text-white">MySpace</span>
        </div>
        <main id="app-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
