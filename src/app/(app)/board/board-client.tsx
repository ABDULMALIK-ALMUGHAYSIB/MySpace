"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  PRIORITIES,
  PRIORITY_STYLES,
  PriorityValue,
  STATUSES,
  STATUS_LABELS,
  StatusValue,
  avatarColor,
  formatDate,
  initials,
  isOverdue,
} from "@/lib/task-meta";

type Requester = { id: string; name: string; team: string | null };

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: PriorityValue;
  status: StatusValue;
  dueDate: string | null;
  requesterId: string | null;
  requester: Requester | null;
};

const COLUMN_STYLES: Record<StatusValue, string> = {
  New: "border-t-slate-400",
  InProgress: "border-t-blue-500",
  Blocked: "border-t-red-500",
  Done: "border-t-emerald-500",
};

const emptyForm = {
  title: "",
  description: "",
  requesterId: "",
  priority: "Medium" as PriorityValue,
  status: "New" as StatusValue,
  dueDate: "",
};

export default function BoardClient({
  initialTasks,
  requesters,
}: {
  initialTasks: Task[];
  requesters: Requester[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState(initialTasks);
  const [modalTask, setModalTask] = useState<Task | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [filterRequester, setFilterRequester] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortByDue, setSortByDue] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openNew();
      router.replace("/board");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setForm(emptyForm);
    setModalTask("new");
  }

  function openEdit(t: Task) {
    setForm({
      title: t.title,
      description: t.description ?? "",
      requesterId: t.requesterId ?? "",
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    });
    setModalTask(t);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      requesterId: form.requesterId || null,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || null,
    };

    if (modalTask === "new") {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);
    } else if (modalTask) {
      const res = await fetch(`/api/tasks/${modalTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }

    setSaving(false);
    setModalTask(null);
    router.refresh();
  }

  async function handleDelete(t: Task) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    router.refresh();
  }

  async function handleStatusChange(t: Task, status: StatusValue) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    router.refresh();
  }

  const filtered = useMemo(() => {
    let result = tasks;
    if (filterRequester) result = result.filter((t) => t.requesterId === filterRequester);
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (sortByDue) {
      result = [...result].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return result;
  }, [tasks, filterRequester, filterPriority, sortByDue]);

  const columns = STATUSES.map((status) => ({
    status,
    tasks: filtered.filter((t) => t.status === status),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add New Task
        </button>

        <select
          value={filterRequester}
          onChange={(e) => setFilterRequester(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
        >
          <option value="">All requesters</option>
          {requesters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <button
          onClick={() => setSortByDue((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            sortByDue
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-300 bg-white text-slate-700"
          }`}
        >
          Sort by due date
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <div key={col.status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700">
                {STATUS_LABELS[col.status]}
              </h3>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {col.tasks.length}
              </span>
            </div>

            <div
              className={`flex flex-col gap-3 rounded-2xl border-t-4 bg-slate-100/60 p-3 ${COLUMN_STYLES[col.status]}`}
              style={{ minHeight: 120 }}
            >
              {col.tasks.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">No tasks</p>
              )}
              {col.tasks.map((t) => {
                const overdueFlag = isOverdue(t.dueDate, t.status);
                return (
                  <div
                    key={t.id}
                    className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${
                      overdueFlag ? "ring-red-300" : "ring-transparent"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{t.title}</p>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {t.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-slate-500">{t.description}</p>
                    )}

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[t.priority]}`}
                      >
                        {t.priority}
                      </span>
                      {t.dueDate && (
                        <span
                          className={`text-[11px] font-medium ${overdueFlag ? "text-red-600" : "text-slate-500"}`}
                        >
                          {overdueFlag ? "Overdue · " : "Due "}
                          {formatDate(t.dueDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {t.requester ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor(
                              t.requester.name
                            )}`}
                          >
                            {initials(t.requester.name)}
                          </div>
                          <span className="text-xs text-slate-500">{t.requester.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">No requester</span>
                      )}

                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t, e.target.value as StatusValue)}
                        className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600 outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalTask === "new" ? "Add Task" : "Edit Task"}
              </h3>
              <button
                onClick={() => setModalTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Update quarterly report"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Requester
                  </label>
                  <select
                    value={form.requesterId}
                    onChange={(e) => setForm({ ...form, requesterId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">No requester</option>
                    {requesters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as PriorityValue })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusValue })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalTask(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
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
