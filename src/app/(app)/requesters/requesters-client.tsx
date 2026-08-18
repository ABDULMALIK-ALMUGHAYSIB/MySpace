"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { avatarColor, initials } from "@/lib/task-meta";

type Requester = {
  id: string;
  name: string;
  team: string | null;
  notes: string | null;
  taskCount: number;
};

export default function RequestersClient({
  initialRequesters,
}: {
  initialRequesters: Requester[];
}) {
  const router = useRouter();
  const [requesters, setRequesters] = useState(initialRequesters);
  const [editing, setEditing] = useState<Requester | "new" | null>(null);
  const [form, setForm] = useState({ name: "", team: "", notes: "" });
  const [saving, setSaving] = useState(false);

  function openNew() {
    setForm({ name: "", team: "", notes: "" });
    setEditing("new");
  }

  function openEdit(r: Requester) {
    setForm({ name: r.name, team: r.team ?? "", notes: r.notes ?? "" });
    setEditing(r);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    if (editing === "new") {
      const res = await fetch("/api/requesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setRequesters((prev) =>
        [...prev, { ...created, taskCount: 0 }].sort((a, b) => a.name.localeCompare(b.name))
      );
    } else if (editing) {
      const res = await fetch(`/api/requesters/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setRequesters((prev) =>
        prev
          .map((r) => (r.id === editing.id ? { ...r, ...updated } : r))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(r: Requester) {
    const msg =
      r.taskCount > 0
        ? `Delete ${r.name}? This will also delete their ${r.taskCount} task(s).`
        : `Delete ${r.name}?`;
    if (!confirm(msg)) return;

    await fetch(`/api/requesters/${r.id}`, { method: "DELETE" });
    setRequesters((prev) => prev.filter((x) => x.id !== r.id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={openNew}
        className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Plus size={16} />
        Add Requester
      </button>

      {requesters.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
          No requesters yet. Add the people who usually send you tasks.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requesters.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(
                      r.name
                    )}`}
                  >
                    {initials(r.name)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{r.name}</p>
                    {r.team && <p className="text-xs text-slate-500">{r.team}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(r)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {r.notes && <p className="mt-3 text-sm text-slate-500">{r.notes}</p>}
              <p className="mt-3 text-xs font-medium text-slate-400">
                {r.taskCount} task{r.taskCount === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editing === "new" ? "Add Requester" : "Edit Requester"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Sarah Ahmed"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Team / Department (optional)
                </label>
                <input
                  value={form.team}
                  onChange={(e) => setForm({ ...form, team: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Product"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
