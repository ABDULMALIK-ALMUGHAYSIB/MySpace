import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "@/context/AuthProvider";

export default function AppLayout() {
  const { user } = useAuth();
  const userName = (user?.user_metadata?.name as string | undefined) ?? "User";
  const userEmail = user?.email ?? "";

  return (
    <div className="flex h-screen flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
