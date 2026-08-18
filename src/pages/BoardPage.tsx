import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import type { Task } from "@/lib/types";
import {
  PRIORITIES,
  PRIORITY_STYLES,
  type PriorityValue,
  STATUSES,
  STATUS_LABELS,
  type StatusValue,
  avatarColor,
  formatDate,
  initials,
  isOverdue,
} from "@/lib/task-meta";

const COLUMN_STYLES: Record<StatusValue, string> = {
  New: "border-t-slate-400",
  InProgress: "border-t-blue-500",
  Blocked: "border-t-red-500",
  Done: "border-t-emerald-500",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const emptyForm = {
  title: "",
  description: "",
  requesterName: "",
  priority: "Medium" as PriorityValue,
  status: "New" as StatusValue,
  dueDate: "",
};

export default function BoardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalTask, setModalTask] = useState<Task | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [filterRequester, setFilterRequester] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortByDue, setSortByDue] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<StatusValue | null>(null);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTasks(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openNew();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requesterOptions = useMemo(
    () =>
      Array.from(
        new Set(tasks.map((t) => t.requester_name).filter((n): n is string => !!n))
      ).sort((a, b) => a.localeCompare(b)),
    [tasks]
  );

  function openNew() {
    setForm(emptyForm);
    setModalTask("new");
  }

  function openEdit(t: Task) {
    setForm({
      title: t.title,
      description: t.description ?? "",
      requesterName: t.requester_name ?? "",
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date ? t.due_date.slice(0, 10) : "",
    });
    setModalTask(t);
  }

  async function handleSave() {
    if (!form.title.trim() || !user) return;
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description || null,
      requester_name: form.requesterName || null,
      priority: form.priority,
      status: form.status,
      due_date: form.dueDate || null,
    };

    if (modalTask === "new") {
      const { data } = await supabase
        .from("tasks")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (data) setTasks((prev) => [data, ...prev]);
    } else if (modalTask) {
      const { data } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", modalTask.id)
        .select()
        .single();
      if (data) setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    }

    setSaving(false);
    setModalTask(null);
  }

  async function handleDelete(t: Task) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    await supabase.from("tasks").delete().eq("id", t.id);
  }

  async function handleStatusChange(taskId: string, status: StatusValue) {
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, status } : x)));
    await supabase.from("tasks").update({ status }).eq("id", taskId);
  }

  function handleDrop(status: StatusValue, e: React.DragEvent) {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) handleStatusChange(taskId, status);
  }

  const filtered = useMemo(() => {
    let result = tasks;
    if (filterRequester) result = result.filter((t) => t.requester_name === filterRequester);
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (sortByDue) {
      result = [...result].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    }
    return result;
  }, [tasks, filterRequester, filterPriority, sortByDue]);

  const columns = STATUSES.map((status) => ({
    status,
    tasks: filtered.filter((t) => t.status === status),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Board</h1>
        <p className="mt-1 text-sm text-slate-500">Track every task from request to done.</p>
      </div>

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
            {requesterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
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

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : (
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(col.status);
                  }}
                  onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
                  onDrop={(e) => handleDrop(col.status, e)}
                  className={`flex flex-col gap-3 rounded-2xl border-t-4 bg-slate-100/60 p-3 transition-colors ${COLUMN_STYLES[col.status]} ${
                    dragOverStatus === col.status ? "bg-blue-50 ring-2 ring-blue-300" : ""
                  }`}
                  style={{ minHeight: 120 }}
                >
                  {col.tasks.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">No tasks</p>
                  )}
                  {col.tasks.map((t) => {
                    const overdueFlag = isOverdue(t.due_date, t.status);
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", t.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={`cursor-grab rounded-xl bg-white p-4 shadow-sm ring-1 active:cursor-grabbing ${
                          overdueFlag ? "ring-red-300" : "ring-transparent"
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-1.5">
                            <GripVertical size={14} className="mt-0.5 shrink-0 text-slate-300" />
                            <p className="text-sm font-medium text-slate-900">{t.title}</p>
                          </div>
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
                          <p className="mb-3 line-clamp-2 text-xs text-slate-500">
                            {t.description}
                          </p>
                        )}

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[t.priority]}`}
                          >
                            {t.priority}
                          </span>
                          {t.due_date && (
                            <span
                              className={`text-[11px] font-medium ${overdueFlag ? "text-red-600" : "text-slate-500"}`}
                            >
                              {overdueFlag ? "Overdue · " : "Due "}
                              {formatDate(t.due_date)}
                            </span>
                          )}
                        </div>

                        {t.requester_name ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor(
                                t.requester_name
                              )}`}
                            >
                              {initials(t.requester_name)}
                            </div>
                            <span className="text-xs text-slate-500">{t.requester_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">No requester</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Requester (optional)
                </label>
                <input
                  value={form.requesterName}
                  onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g. Sara"
                  list="requester-suggestions"
                />
                <datalist id="requester-suggestions">
                  {requesterOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as PriorityValue })
                    }
                    className={INPUT_CLASS}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusValue })}
                    className={INPUT_CLASS}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className={INPUT_CLASS}
                />
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
