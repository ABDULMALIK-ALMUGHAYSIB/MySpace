import { Outlet } from "react-router-dom";
import { FolderKanban } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="flex flex-1 min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <FolderKanban size={20} />
          </div>
          <span className="text-xl font-semibold text-white">MySpace</span>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
