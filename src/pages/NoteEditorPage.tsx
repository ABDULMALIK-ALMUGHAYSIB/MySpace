import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/mantine/style.css";
import { ArrowLeft, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/lib/theme";
import type { Note } from "@/lib/types";

export default function NoteEditorPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    setNotFound(false);
    supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single()
      .then(({ data }) => {
        setNote(data);
        setNotFound(!data);
        setLoading(false);
      });
  }, [noteId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Note not found.</p>
        <button
          onClick={() => navigate("/notes")}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to Notes
        </button>
      </div>
    );
  }

  return <NoteEditor key={note.id} note={note} />;
}

function parseInitialContent(content: string): PartialBlock[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function NoteEditor({ note }: { note: Note }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState(note.title);
  const savedTitleRef = useRef(note.title);
  const savedContentRef = useRef(note.content);
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function uploadImage(file: File) {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("note-images").upload(path, file);
    if (error) {
      toast.error("Couldn't upload image");
      throw error;
    }
    return supabase.storage.from("note-images").getPublicUrl(path).data.publicUrl;
  }

  const editor = useCreateBlockNote(
    {
      initialContent: parseInitialContent(savedContentRef.current),
      uploadFile: uploadImage,
    },
    [resetKey]
  );

  function startEdit() {
    setMode("edit");
  }

  function cancelEdit() {
    setTitle(savedTitleRef.current);
    setResetKey((k) => k + 1);
    setMode("view");
  }

  async function handleSave() {
    setSaving(true);
    const content = JSON.stringify(editor.document);
    const { error } = await supabase
      .from("notes")
      .update({ title, content })
      .eq("id", note.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save note");
      return;
    }
    savedTitleRef.current = title;
    savedContentRef.current = content;
    setMode("view");
    toast.success("Note saved");
  }

  async function confirmDeleteNote() {
    setDeleting(true);
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    setDeleting(false);
    if (error) {
      toast.error("Couldn't delete note");
      return;
    }
    navigate("/notes");
  }

  const editing = mode === "edit";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/notes")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Notes
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={15} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Pencil size={15} />
              Edit
            </button>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            title="Delete note"
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full border-none bg-transparent text-3xl font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600"
        />
      ) : (
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          {title || "Untitled"}
        </h1>
      )}

      <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-800">
        <BlockNoteView editor={editor} editable={editing} theme={isDark ? "dark" : "light"} />
      </div>

      {deleteConfirm && (
        <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete note?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                "{title || "Untitled"}"
              </span>
              ? This can't be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNote}
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
