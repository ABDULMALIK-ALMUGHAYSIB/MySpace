import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import type { Board } from "@/lib/types";

type BoardsContextValue = {
  boards: Board[];
  loading: boolean;
  createBoard: (name: string) => Promise<Board | null>;
  renameBoard: (id: string, name: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
};

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined);

export function BoardsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [ensuredDefault, setEnsuredDefault] = useState(false);

  const createBoard = useCallback(
    async (name: string) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("boards")
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error || !data) return null;
      setBoards((prev) => [...prev, data]);
      return data;
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setBoards([]);
      setLoading(false);
      setEnsuredDefault(false);
      return;
    }
    let active = true;
    supabase
      .from("boards")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setBoards(data ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (loading || ensuredDefault || boards.length > 0 || !user) return;
    setEnsuredDefault(true);
    createBoard("General");
  }, [loading, ensuredDefault, boards.length, user, createBoard]);

  async function renameBoard(id: string, name: string) {
    const { data, error } = await supabase
      .from("boards")
      .update({ name })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setBoards((prev) => prev.map((b) => (b.id === id ? data : b)));
    }
  }

  async function deleteBoard(id: string) {
    const { error } = await supabase.from("boards").delete().eq("id", id);
    if (!error) {
      setBoards((prev) => prev.filter((b) => b.id !== id));
    }
  }

  return (
    <BoardsContext.Provider value={{ boards, loading, createBoard, renameBoard, deleteBoard }}>
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards() {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error("useBoards must be used within BoardsProvider");
  return ctx;
}
