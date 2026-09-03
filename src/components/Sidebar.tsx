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
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { initials, avatarColor } from "@/lib/task-meta";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { useBoards } from "@/context/BoardsProvider";
import { LAST_BOARD_KEY } from "@/lib/last-board";
import type { Board } from "@/lib/types";

export default function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { isDark, toggle } = useTheme();
  const { boards, createBoard, renameBoard, deleteBoard } = useBoards();

  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState("");
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<Board | null>(null);

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

  function startEditBoard(board: Board) {
    setEditingBoardId(board.id);
    setEditingBoardName(board.name);
  }

  async function submitEditBoard() {
    const name = editingBoardName.trim();
    if (editingBoardId && name) await renameBoard(editingBoardId, name);
    setEditingBoardId(null);
  }

  async function confirmDeleteBoard() {
    if (!deleteBoardTarget) return;
    const wasActive = location.pathname === `/board/${deleteBoardTarget.id}`;
    await deleteBoard(deleteBoardTarget.id);
    setDeleteBoardTarget(null);
    if (wasActive) navigate("/board", { replace: true });
  }

  return (
    <aside
      className={`flex shrink-0 flex-col bg-slate-950 py-6 ${
        collapsed ? "w-20 px-2" : "w-64 px-4"
      }`}
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
              if (editingBoardId === board.id) {
                return (
                  <div key={board.id} className="flex items-center gap-1 px-2">
                    <input
                      autoFocus
                      value={editingBoardName}
                      onChange={(e) => setEditingBoardName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitEditBoard();
                        if (e.key === "Escape") setEditingBoardId(null);
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={submitEditBoard}
                      className="shrink-0 rounded p-1 text-emerald-400 hover:bg-slate-900"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingBoardId(null)}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              }
              return (
                <div key={board.id} className="group/board flex items-center gap-1">
                  <Link
                    to={`/board/${board.id}`}
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
                    onClick={() => startEditBoard(board)}
                    title="Rename board"
                    className="shrink-0 rounded p-1 text-slate-500 opacity-0 hover:bg-slate-900 hover:text-white group-hover/board:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteBoardTarget(board)}
                    title="Delete board"
                    className="shrink-0 rounded p-1 text-slate-500 opacity-0 hover:bg-red-500/10 hover:text-red-400 group-hover/board:opacity-100"
                  >
                    <Trash2 size={13} />
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
    </aside>
  );
}
