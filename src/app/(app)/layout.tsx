import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      <Sidebar userName={session.user.name ?? "User"} userEmail={session.user.email ?? ""} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
