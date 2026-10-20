import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Check,
  CircleAlert,
  GripVertical,
  Inbox,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { useBoards } from "@/context/BoardsProvider";
import { LAST_BOARD_KEY } from "@/lib/last-board";
import type { NotesType, Task } from "@/lib/types";
import {
  PRIORITIES,
  PRIORITY_STYLES,
  type PriorityValue,
  STATUSES,
  STATUS_LABELS,
  type StatusValue,
  avatarColor,
  cardTint,
  daysRemaining,
  forceLight,
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
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white";

// 1x1 transparent gif used to suppress the browser's own (semi-transparent) drag
// ghost so we can render a fully opaque custom preview that follows the cursor instead.
const BLANK_DRAG_IMAGE = new Image();
BLANK_DRAG_IMAGE.src =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7";

const emptyForm = {
  title: "",
  description: "",
  notesType: "note" as NotesType,
  steps: [] as string[],
  requesterName: "",
  priority: "Medium" as PriorityValue,
  status: "New" as StatusValue,
  dueDate: "",
};

export default function BoardPage() {
  const { user } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const { boards, renameBoard, deleteBoard } = useBoards();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const board = boards.find((b) => b.id === boardId) ?? null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalTask, setModalTask] = useState<Task | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [deleteBoardConfirm, setDeleteBoardConfirm] = useState(false);

  const [filterRequester, setFilterRequester] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortByDue, setSortByDue] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<StatusValue | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ taskId: string; edge: "above" | "below" } | null>(
    null
  );
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [moveTarget, setMoveTarget] = useState<Task | null>(null);
  const dragGrabOffset = useRef({ x: 24, y: 16 });
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);

  function updateDragPos(pos: { x: number; y: number } | null) {
    dragPosRef.current = pos;
    setDragPos(pos);
  }

  // Auto-scroll the page while dragging a card near the top/bottom edge of the
  // scrollable content area, so you can drag into a part of a long column that's
  // currently scrolled out of view instead of having to drop, scroll, and re-drag.
  useEffect(() => {
    if (!draggingId) return;
    const scrollEl = document.getElementById("app-scroll-container");
    if (!scrollEl) return;

    const edge = 90;
    const maxSpeed = 16;
    let raf: number;

    function tick() {
      const pos = dragPosRef.current;
      if (pos) {
        const rect = scrollEl!.getBoundingClientRect();
        if (pos.y < rect.top + edge) {
          const intensity = (rect.top + edge - pos.y) / edge;
          scrollEl!.scrollTop -= maxSpeed * Math.min(1, intensity);
        } else if (pos.y > rect.bottom - edge) {
          const intensity = (pos.y - (rect.bottom - edge)) / edge;
          scrollEl!.scrollTop += maxSpeed * Math.min(1, intensity);
        }
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draggingId]);

  useEffect(() => {
    if (!boardId) return;
    localStorage.setItem(LAST_BOARD_KEY, boardId);
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    supabase
      .from("tasks")
      .select("*")
      .eq("board_id", boardId)
      .order("position", { ascending: true })
      .then(({ data }) => {
        setTasks(data ?? []);
        setLoading(false);
      });
  }, [boardId]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openNew();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function startRenameBoard() {
    if (!board) return;
    setBoardNameDraft(board.name);
    setEditingBoardName(true);
  }

  async function saveRenameBoard() {
    const name = boardNameDraft.trim();
    if (name && board && name !== board.name) {
      await renameBoard(board.id, name);
    }
    setEditingBoardName(false);
  }

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
      notesType: t.notes_type ?? "note",
      steps: t.steps?.length ? t.steps : [],
      requesterName: t.requester_name ?? "",
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date ? t.due_date.slice(0, 10) : "",
    });
    setModalTask(t);
  }

  function setNotesType(notesType: NotesType) {
    setForm((f) => ({
      ...f,
      notesType,
      steps: notesType === "steps" && f.steps.length === 0 ? [""] : f.steps,
    }));
  }

  function updateStep(index: number, value: string) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === index ? value : s)) }));
  }

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  }

  function removeStep(index: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.title.trim() || !user || !boardId) return;
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.notesType === "note" ? form.description || null : null,
      notes_type: form.notesType,
      steps:
        form.notesType === "steps" ? form.steps.map((s) => s.trim()).filter(Boolean) : [],
      requester_name: form.requesterName || null,
      priority: form.priority,
      status: form.status,
      due_date: form.dueDate || null,
      board_id: boardId,
    };

    if (modalTask === "new") {
      const columnTasks = tasks.filter((t) => t.status === form.status);
      const position = columnTasks.length
        ? Math.min(...columnTasks.map((t) => t.position)) - 1000
        : 1000;
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...payload, user_id: user.id, position })
        .select()
        .single();
      if (data) {
        setTasks((prev) => [...prev, data]);
        toast.success("Task created");
      } else if (error) {
        toast.error("Couldn't create task");
      }
    } else if (modalTask) {
      const { data, error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", modalTask.id)
        .select()
        .single();
      if (data) {
        setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
        toast.success("Task updated");
      } else if (error) {
        toast.error("Couldn't update task");
      }
    }

    setSaving(false);
    setModalTask(null);
  }

  function handleDelete(t: Task) {
    setDeleteTarget(t);
  }

  async function confirmDeleteBoard() {
    if (!board) return;
    await deleteBoard(board.id);
    setDeleteBoardConfirm(false);
    toast.success(`"${board.name}" board deleted`);
    navigate("/board", { replace: true });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const t = deleteTarget;
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error("Couldn't delete task");
      return;
    }
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    toast.success(`"${t.title}" deleted`);
  }

  async function moveTask(taskId: string, status: StatusValue, position: number) {
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, status, position } : x)));
    await supabase.from("tasks").update({ status, position }).eq("id", taskId);
  }

  function getTargetColumnTasks(status: StatusValue, excludeId: string) {
    return filtered
      .filter((t) => t.status === status && t.id !== excludeId)
      .sort((a, b) => a.position - b.position);
  }

  function handleQuickMove(status: StatusValue) {
    if (!moveTarget || status === moveTarget.status) return;
    const columnTasks = getTargetColumnTasks(status, moveTarget.id);
    const newPosition = columnTasks.length ? columnTasks[columnTasks.length - 1].position + 1000 : 1000;
    moveTask(moveTarget.id, status, newPosition);
    setMoveTarget(null);
  }

  function resetDragState() {
    setDragOverStatus(null);
    setDropIndicator(null);
    // Don't rely solely on the source card's dragend: if the drop moves the task to a
    // different column, React unmounts that card before dragend can fire on it, which
    // would otherwise leave the floating preview and placeholder stuck on screen.
    setDraggingId(null);
    updateDragPos(null);
  }

  function handleCardDrop(status: StatusValue, targetTask: Task, e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData("text/plain");
    resetDragState();
    if (!taskId || taskId === targetTask.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const edge: "above" | "below" = e.clientY - rect.top < rect.height / 2 ? "above" : "below";
    const columnTasks = getTargetColumnTasks(status, taskId);
    const idx = columnTasks.findIndex((t) => t.id === targetTask.id);
    const prev = edge === "above" ? columnTasks[idx - 1] : columnTasks[idx];
    const next = edge === "above" ? columnTasks[idx] : columnTasks[idx + 1];
    const newPosition =
      prev && next
        ? (prev.position + next.position) / 2
        : prev
          ? prev.position + 1000
          : next
            ? next.position - 1000
            : 1000;
    moveTask(taskId, status, newPosition);
  }

  function handleColumnDrop(status: StatusValue, e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    resetDragState();
    if (!taskId) return;

    const columnTasks = getTargetColumnTasks(status, taskId);
    const newPosition = columnTasks.length ? columnTasks[columnTasks.length - 1].position + 1000 : 1000;
    moveTask(taskId, status, newPosition);
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

  const columns = STATUSES.map((status) => {
    const colTasks = filtered.filter((t) => t.status === status);
    if (!sortByDue) colTasks.sort((a, b) => a.position - b.position);
    return { status, tasks: colTasks };
  });

  const draggingTask = tasks.find((t) => t.id === draggingId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        {editingBoardName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={boardNameDraft}
              onChange={(e) => setBoardNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRenameBoard();
                if (e.key === "Escape") setEditingBoardName(false);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-2xl font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={saveRenameBoard}
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => setEditingBoardName(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="group flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {board?.name ?? "Board"}
            </h1>
            <button
              onClick={startRenameBoard}
              className="rounded-lg p-1.5 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              title="Rename board"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setDeleteBoardConfirm(true)}
              className="rounded-lg p-1.5 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              title="Delete board"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track every task from request to done.
        </p>
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400"
                : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            Sort by due date
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((status) => (
              <div key={status} className="flex flex-col gap-3">
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="flex flex-col gap-3 rounded-2xl bg-slate-100/60 p-3 dark:bg-slate-800/60">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl bg-white dark:bg-slate-800"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => (
              <div key={col.status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {STATUS_LABELS[col.status]}
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {col.tasks.length}
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(col.status);
                    // Only clear the per-card insertion indicator when hovering the column's
                    // own empty space — a bubbled dragover from a card already set it for us.
                    if (e.target === e.currentTarget) setDropIndicator(null);
                  }}
                  onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
                  onDrop={(e) => handleColumnDrop(col.status, e)}
                  className={`flex flex-col gap-3 rounded-2xl border-t-4 bg-slate-100/60 p-3 transition-colors dark:bg-slate-800/60 ${COLUMN_STYLES[col.status]} ${
                    dragOverStatus === col.status
                      ? "bg-blue-50 ring-2 ring-blue-300 dark:bg-blue-500/10 dark:ring-blue-500/40"
                      : ""
                  }`}
                  style={{ minHeight: 120 }}
                >
                  {col.tasks.length === 0 && (
                    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                      <Inbox size={18} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-xs text-slate-400 dark:text-slate-500">No tasks</p>
                    </div>
                  )}
                  {col.tasks.map((t) => {
                    const overdueFlag = isOverdue(t.due_date, t.status);
                    const remaining = daysRemaining(t.due_date, t.status);
                    const steps = t.steps ?? [];
                    const isDragging = draggingId === t.id;
                    const indicator =
                      dropIndicator?.taskId === t.id ? dropIndicator.edge : null;
                    return (
                      <div key={t.id} className="contents">
                        {indicator === "above" && (
                          <div className="h-0.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", t.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setDragImage(BLANK_DRAG_IMAGE, 0, 0);
                            const rect = e.currentTarget.getBoundingClientRect();
                            // Clamp to the floating preview's own size (w-64, ~80px tall) so the
                            // spot you grabbed stays under the cursor instead of trailing off.
                            dragGrabOffset.current = {
                              x: Math.min(e.clientX - rect.left, 220),
                              y: Math.min(e.clientY - rect.top, 60),
                            };
                            setDraggingId(t.id);
                            updateDragPos({ x: e.clientX, y: e.clientY });
                          }}
                          onDrag={(e) => {
                            if (e.clientX === 0 && e.clientY === 0) return;
                            updateDragPos({ x: e.clientX, y: e.clientY });
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            updateDragPos(null);
                            setDropIndicator(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const edge: "above" | "below" =
                              e.clientY - rect.top < rect.height / 2 ? "above" : "below";
                            setDropIndicator({ taskId: t.id, edge });
                          }}
                          onDrop={(e) => handleCardDrop(col.status, t, e)}
                          className={`rounded-xl p-4 transition-all active:cursor-grabbing ${
                            isDragging
                              ? "cursor-grabbing border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/40"
                              : `cursor-grab shadow-sm ring-1 hover:shadow-md hover:-translate-y-0.5 ${
                                  overdueFlag ? "bg-white ring-red-300" : cardTint(t.id)
                                }`
                          }`}
                        >
                        <div className={isDragging ? "invisible" : ""}>
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-1.5">
                              <GripVertical size={14} className="mt-0.5 shrink-0 text-slate-300" />
                              <p className="text-sm font-medium text-slate-900">{t.title}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => setMoveTarget(t)}
                                title="Move to another column"
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
                              >
                                <ArrowLeftRight size={13} />
                              </button>
                              <button
                                onClick={() => setViewTask(t)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <CircleAlert size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(t)}
                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="mb-2.5 border-t border-slate-900/10" />

                          {t.notes_type === "steps" && steps.length > 0 ? (
                            <ul className="mb-3 flex flex-col gap-0.5">
                              {steps.slice(0, 3).map((s, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-1.5 text-xs text-slate-500"
                                >
                                  <span className="shrink-0 font-medium text-slate-400">
                                    {i + 1}.
                                  </span>
                                  <span className="line-clamp-1">{s}</span>
                                </li>
                              ))}
                              {steps.length > 3 && (
                                <li className="pl-4 text-xs text-slate-400">
                                  +{steps.length - 3} more
                                </li>
                              )}
                            </ul>
                          ) : (
                            t.description && (
                              <p className="mb-3 line-clamp-2 text-xs text-slate-500">
                                {t.description}
                              </p>
                            )
                          )}

                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${forceLight(PRIORITY_STYLES[t.priority])}`}
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
                            {remaining && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                {remaining}
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
                        </div>
                        {indicator === "below" && (
                          <div className="h-0.5 shrink-0 rounded-full bg-blue-500" />
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

      {draggingTask && dragPos && (
        <div
          className={`pointer-events-none fixed z-50 w-64 -rotate-2 rounded-xl p-4 opacity-95 shadow-xl ring-1 ${cardTint(draggingTask.id)}`}
          style={{
            left: dragPos.x - dragGrabOffset.current.x,
            top: dragPos.y - dragGrabOffset.current.y,
          }}
        >
          <p className="mb-2 truncate text-sm font-medium text-slate-900">{draggingTask.title}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${forceLight(PRIORITY_STYLES[draggingTask.priority])}`}
          >
            {draggingTask.priority}
          </span>
        </div>
      )}

      {moveTarget && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Move task</h3>
              <button
                onClick={() => setMoveTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 truncate text-sm text-slate-500 dark:text-slate-400">
              {moveTarget.title}
            </p>
            <div className="flex flex-col gap-2">
              {STATUSES.map((status) => {
                const isCurrent = status === moveTarget.status;
                return (
                  <button
                    key={status}
                    onClick={() => handleQuickMove(status)}
                    disabled={isCurrent}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
                      isCurrent
                        ? "cursor-default border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400"
                        : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                    {isCurrent && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewTask && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {viewTask.title}
              </h3>
              <button
                onClick={() => setViewTask(null)}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[viewTask.priority]}`}
                >
                  {viewTask.priority}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {STATUS_LABELS[viewTask.status]}
                </span>
                {viewTask.due_date && (
                  <span
                    className={`text-xs font-medium ${isOverdue(viewTask.due_date, viewTask.status) ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    {isOverdue(viewTask.due_date, viewTask.status) ? "Overdue · " : "Due "}
                    {formatDate(viewTask.due_date)}
                  </span>
                )}
              </div>

              {viewTask.requester_name ? (
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
                      viewTask.requester_name
                    )}`}
                  >
                    {initials(viewTask.requester_name)}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {viewTask.requester_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm italic text-slate-400 dark:text-slate-500">
                  No requester
                </span>
              )}

              {viewTask.notes_type === "steps" && viewTask.steps.length > 0 ? (
                <ol className="flex flex-col gap-1.5">
                  {viewTask.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="shrink-0 font-medium text-slate-400 dark:text-slate-500">
                        {i + 1}.
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              ) : viewTask.description ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {viewTask.description}
                </p>
              ) : (
                <p className="text-sm italic text-slate-400 dark:text-slate-500">
                  No details added.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewTask(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const t = viewTask;
                  setViewTask(null);
                  openEdit(t);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {modalTask && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {modalTask === "new" ? "Add Task" : "Edit Task"}
              </h3>
              <button
                onClick={() => setModalTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Title
                </label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g. Update quarterly report"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Details (optional)
                  </label>
                  <div className="flex gap-0.5 rounded-lg border border-slate-300 p-0.5 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => setNotesType("note")}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.notesType === "note"
                          ? "bg-blue-600 text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotesType("steps")}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.notesType === "steps"
                          ? "bg-blue-600 text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      Steps
                    </button>
                  </div>
                </div>

                {form.notesType === "note" ? (
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className={INPUT_CLASS}
                    placeholder="Add any extra context..."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {form.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-right text-xs font-medium text-slate-400 dark:text-slate-500">
                          {i + 1}.
                        </span>
                        <input
                          autoFocus={i === form.steps.length - 1 && form.steps.length > 1}
                          value={step}
                          onChange={(e) => updateStep(i, e.target.value)}
                          className={INPUT_CLASS}
                          placeholder={`Step ${i + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addStep}
                      className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                    >
                      <Plus size={14} />
                      Add step
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
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
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
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

      {deleteBoardConfirm && board && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete board?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                "{board.name}"
              </span>
              ? All {tasks.length} task{tasks.length === 1 ? "" : "s"} on it will be deleted too.
              This can't be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteBoardConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBoard}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete task?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                "{deleteTarget.title}"
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
