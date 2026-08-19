import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { avatarColor, initials } from "@/lib/task-meta";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white";

export default function ProfilePage() {
  const { user } = useAuth();
  const currentName = (user?.user_metadata?.name as string | undefined) ?? "";
  const email = user?.email ?? "";

  const [name, setName] = useState(currentName);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    setSavingName(false);
    if (error) {
      toast.error("Couldn't update name");
      return;
    }
    toast.success("Name updated");
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account details.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${avatarColor(
            email
          )}`}
        >
          {initials(currentName || email)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-slate-900 dark:text-white">
            {currentName || "No name set"}
          </p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{email}</p>
        </div>
      </div>

      <form
        onSubmit={handleSaveName}
        className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Name</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input value={email} disabled className={`${INPUT_CLASS} opacity-60`} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
            placeholder="e.g. Abdulmalik"
          />
        </div>

        <button
          type="submit"
          disabled={savingName || !name.trim() || name.trim() === currentName}
          className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {savingName ? "Saving..." : "Save name"}
        </button>
      </form>

      <form
        onSubmit={handleSavePassword}
        className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Change password
        </h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            New password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={INPUT_CLASS}
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit"
          disabled={savingPassword || !newPassword || !confirmPassword}
          className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {savingPassword ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
