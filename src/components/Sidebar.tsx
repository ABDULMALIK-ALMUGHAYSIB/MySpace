import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  LogOut,
  Plus,
  Moon,
  Sun,
  FolderKanban,
  NotebookText,
  Mail,
  Settings,
  Trash2,
  Check,
  X,
} from "lucide-react";
import {
  STAGE_COLORS,
  STAGE_COLOR_SWATCH_CLASS,
  type StageColor,
  STATUSES,
  STATUS_LABELS,
  avatarColor,
  defaultStageColor,
  initials,
} from "@/lib/task-meta";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { useBoards } from "@/context/BoardsProvider";
import { LAST_BOARD_KEY } from "@/lib/last-board";
import type { Board } from "@/lib/types";

const SETTINGS_INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white";

export default function Sidebar({
  userName,
  userEmail,
  mobileOpen,
  onMobileClose,
}: {
  userName: string;
  userEmail: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { isDark, toggle } = useTheme();
  const { boards, createBoard, renameBoard, deleteBoard, updateStages } = useBoards();

  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<Board | null>(null);
  const [settingsBoard, setSettingsBoard] = useState<Board | null>(null);
  const [settingsName, setSettingsName] = useState("");
  const [stageDrafts, setStageDrafts] = useState<
    { key: string; label: string; color: StageColor; isNew?: boolean }[]
  >([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const lastBoardId = localStorage.getItem(LAST_BOARD_KEY);
  const quickAddBoardId =
    (location.pathname.startsWith("/board/") && location.pathname.split("/")[2]) ||
    boards.find((b) => b.id === lastBoardId)?.id ||
    boards[0]?.id;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function submitNewBoard() {
    const name = newBoardName.trim();
    setAddingBoard(false);
    setNewBoardName("");
    if (!name) return;
    const board = await createBoard(name);
    if (board) navigate(`/board/${board.id}`);
  }

  function openBoardSettings(board: Board) {
    const order = board.stage_order?.length ? board.stage_order : STATUSES;
    setSettingsName(board.name);
    setStageDrafts(
      order.map((key) => ({
        key,
        label: board.stage_labels?.[key] || STATUS_LABELS[key] || key,
        color: (board.stage_colors?.[key] as StageColor) || defaultStageColor(key),
      }))
    );
    setSettingsBoard(board);
  }

  function addStageDraft() {
    const key = crypto.randomUUID();
    setStageDrafts((prev) => [
      ...prev,
      { key, label: "", color: defaultStageColor(key), isNew: true },
    ]);
  }

  function updateStageDraft(index: number, label: string) {
    setStageDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, label } : d)));
  }

  function updateStageDraftColor(index: number, color: StageColor) {
    setStageDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, color } : d)));
  }

  async function saveBoardSettings() {
    if (!settingsBoard) return;
    setSavingSettings(true);
    const name = settingsName.trim();
    const tasks: Promise<void>[] = [];
    if (name && name !== settingsBoard.name) {
      tasks.push(renameBoard(settingsBoard.id, name));
    }

    const nextLabels = { ...settingsBoard.stage_labels };
    const nextColors = { ...settingsBoard.stage_colors };
    const nextOrder: string[] = [];
    for (const draft of stageDrafts) {
      const label = draft.label.trim();
      if (draft.isNew) {
        if (!label) continue; // discard a stage that was added but left unnamed
        nextLabels[draft.key] = label;
      } else if (label) {
        nextLabels[draft.key] = label;
      }
      nextColors[draft.key] = draft.color;
      nextOrder.push(draft.key);
    }
    const existingOrder = settingsBoard.stage_order?.length ? settingsBoard.stage_order : STATUSES;
    const orderChanged = JSON.stringify(nextOrder) !== JSON.stringify(existingOrder);
    const labelsChanged = JSON.stringify(nextLabels) !== JSON.stringify(settingsBoard.stage_labels);
    const colorsChanged = JSON.stringify(nextColors) !== JSON.stringify(settingsBoard.stage_colors);
    if (orderChanged || labelsChanged || colorsChanged) {
      tasks.push(updateStages(settingsBoard.id, nextOrder, nextLabels, nextColors));
    }

    await Promise.all(tasks);
    setSavingSettings(false);
    setSettingsBoard(null);
  }

  async function confirmDeleteBoard() {
    if (!deleteBoardTarget) return;
    const wasActive = location.pathname === `/board/${deleteBoardTarget.id}`;
    await deleteBoard(deleteBoardTarget.id);
    setDeleteBoardTarget(null);
    if (wasActive) navigate("/board", { replace: true });
  }

  return (
    <>
      {mobileOpen && (
        <div onClick={onMobileClose} className="fixed inset-0 z-30 bg-black/40 md:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-slate-950 px-4 py-6 transition-transform duration-200 ease-out md:static md:translate-x-0 md:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-20 md:px-2" : "md:w-64 md:px-4"}`}
      >
      <button
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`mb-8 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-900 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <FolderKanban size={18} />
        </div>
        {!collapsed && <span className="text-lg font-semibold text-white">MySpace</span>}
      </button>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <Link
          to="/"
          onClick={onMobileClose}
          title={collapsed ? "Dashboard" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? "justify-center" : ""
          } ${
            location.pathname === "/"
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <LayoutDashboard size={18} />
          {!collapsed && "Dashboard"}
        </Link>

        <Link
          to="/notes"
          onClick={onMobileClose}
          title={collapsed ? "Notes" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? "justify-center" : ""
          } ${
            location.pathname.startsWith("/notes")
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <NotebookText size={18} />
          {!collapsed && "Notes"}
        </Link>

        <Link
          to="/emails"
          onClick={onMobileClose}
          title={collapsed ? "Emails" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? "justify-center" : ""
          } ${
            location.pathname.startsWith("/emails")
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <Mail size={18} />
          {!collapsed && "Emails"}
        </Link>

        {collapsed ? (
          <Link
            to={quickAddBoardId ? `/board/${quickAddBoardId}` : "/board"}
            onClick={onMobileClose}
            title="Boards"
            className={`flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname.startsWith("/board")
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <KanbanSquare size={18} />
          </Link>
        ) : (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Boards
              </span>
              <button
                onClick={() => setAddingBoard(true)}
                title="Add board"
                className="rounded p-1 text-slate-500 hover:bg-slate-900 hover:text-white"
              >
                <Plus size={14} />
              </button>
            </div>

            {boards.map((board) => {
              const active = location.pathname === `/board/${board.id}`;
              return (
                <div key={board.id} className="group/board flex items-center gap-1">
                  <Link
                    to={`/board/${board.id}`}
                    onClick={onMobileClose}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <KanbanSquare size={16} className="shrink-0" />
                    <span className="truncate">{board.name}</span>
                  </Link>
                  <button
                    onClick={() => openBoardSettings(board)}
                    title="Board settings"
                    className="shrink-0 rounded p-1 text-slate-500 opacity-0 hover:bg-slate-900 hover:text-white group-hover/board:opacity-100"
                  >
                    <Settings size={13} />
                  </button>
                </div>
              );
            })}

            {addingBoard && (
              <div className="flex items-center gap-1 px-2">
                <input
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitNewBoard();
                    if (e.key === "Escape") setAddingBoard(false);
                  }}
                  placeholder="Board name"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                />
                <button
                  onClick={submitNewBoard}
                  className="shrink-0 rounded p-1 text-emerald-400 hover:bg-slate-900"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setAddingBoard(false)}
                  className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-900"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      <Link
        to={quickAddBoardId ? `/board/${quickAddBoardId}?new=1` : "/board?new=1"}
        onClick={onMobileClose}
        title={collapsed ? "Add New Task" : undefined}
        className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Plus size={16} />
        {!collapsed && "Add New Task"}
      </Link>

      <button
        onClick={toggle}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={`mb-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
        {!collapsed && (isDark ? "Light mode" : "Dark mode")}
      </button>

      <div
        className={`flex items-center gap-1 rounded-lg border-t border-slate-800 pt-4 ${
          collapsed ? "flex-col px-0" : "px-2"
        }`}
      >
        <Link
          to="/profile"
          onClick={onMobileClose}
          title={collapsed ? `${userName} — Profile` : undefined}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-slate-900 ${
            collapsed ? "justify-center" : ""
          } ${location.pathname === "/profile" ? "bg-slate-900" : ""}`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
              userEmail
            )}`}
          >
            {initials(userName)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-slate-400">{userEmail}</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => setConfirmSignOut(true)}
          title="Sign out"
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          <LogOut size={16} />
        </button>
      </div>
      </aside>

      {/* Rendered outside <aside> on purpose: that element has a CSS transform (for the
          mobile slide-in drawer), which creates a new containing block for any
          position: fixed descendant — trapping these overlays inside the sidebar's
          narrow box instead of centering them on the full page. */}
      {settingsBoard && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Board settings
              </h3>
              <button
                onClick={() => setSettingsBoard(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Board name
                </label>
                <input
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className={SETTINGS_INPUT_CLASS}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Stage names
                </label>
                <div className="flex flex-col gap-3">
                  {stageDrafts.map((draft, i) => (
                    <div key={draft.key} className="flex flex-col gap-1.5">
                      <input
                        autoFocus={draft.isNew}
                        value={draft.label}
                        onChange={(e) => updateStageDraft(i, e.target.value)}
                        placeholder={draft.isNew ? "New stage" : STATUS_LABELS[draft.key]}
                        className={SETTINGS_INPUT_CLASS}
                      />
                      <div className="flex flex-wrap gap-1.5 px-0.5">
                        {STAGE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateStageDraftColor(i, color)}
                            title={color}
                            className={`h-5 w-5 shrink-0 rounded-full ${STAGE_COLOR_SWATCH_CLASS[color]} ${
                              draft.color === color
                                ? "ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-slate-800"
                                : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addStageDraft}
                    className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    <Plus size={14} />
                    Add stage
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setDeleteBoardTarget(settingsBoard);
                  setSettingsBoard(null);
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettingsBoard(null)}
                  disabled={savingSettings}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBoardSettings}
                  disabled={savingSettings || !settingsName.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingSettings ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteBoardTarget && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete board?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                "{deleteBoardTarget.name}"
              </span>
              ? All tasks on it will be deleted too. This can't be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteBoardTarget(null)}
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

      {confirmSignOut && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sign out?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to sign out of MySpace?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
