import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { cardTint } from "@/lib/task-meta";
import type { Email } from "@/lib/types";

function extractText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const out: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (Array.isArray(b.content)) {
      for (const item of b.content) {
        if (typeof item === "string") out.push(item);
        else if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
          out.push((item as { text: string }).text);
        }
      }
    }
    if (Array.isArray(b.children)) out.push(extractText(b.children));
  }
  return out.join(" ");
}

function emailPreview(content: string) {
  if (!content) return "";
  try {
    return extractText(JSON.parse(content)).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function formatUpdated(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EmailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Email | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from("emails")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setEmails(data ?? []);
        setLoading(false);
      });
  }, []);

  async function handleNewEmail() {
    if (!user || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("emails")
      .insert({ title: "", content: "", user_id: user.id })
      .select()
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error("Couldn't create email");
      return;
    }
    navigate(`/emails/${data.id}?new=1`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const n = deleteTarget;
    setDeleting(true);
    const { error } = await supabase.from("emails").delete().eq("id", n.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error("Couldn't delete email");
      return;
    }
    setEmails((prev) => prev.filter((x) => x.id !== n.id));
    toast.success(`"${n.title || "Untitled"}" deleted`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Emails</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Keep email formats and drafts you reuse.
          </p>
        </div>
        <button
          onClick={handleNewEmail}
          disabled={creating}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus size={16} />
          New email
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-16 text-center shadow-sm dark:bg-slate-800">
          <Mail size={28} className="text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No emails yet. Start your first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {emails.map((email) => {
            const preview = emailPreview(email.content);
            return (
              <div
                key={email.id}
                onClick={() => navigate(`/emails/${email.id}`)}
                className={`group relative flex cursor-pointer flex-col gap-2 rounded-2xl p-5 ring-1 transition-all hover:-translate-y-0.5 ${cardTint(email.id)}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(email);
                  }}
                  className="absolute right-3 top-3 rounded p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
                <p className="truncate pr-6 text-sm font-semibold text-slate-900">
                  {email.title || "Untitled"}
                </p>
                <div className="border-t border-slate-900/10" />
                <p className="line-clamp-3 min-h-[3.75rem] text-xs text-slate-500">
                  {preview || "No content yet."}
                </p>
                <p className="text-[11px] text-slate-400">
                  Updated {formatUpdated(email.updated_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete email?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                "{deleteTarget.title || "Untitled"}"
              </span>
              ? This can't be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
