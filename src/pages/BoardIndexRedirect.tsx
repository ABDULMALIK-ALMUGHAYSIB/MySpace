import { Navigate, useSearchParams } from "react-router-dom";
import { useBoards } from "@/context/BoardsProvider";
import { LAST_BOARD_KEY } from "@/lib/last-board";

export default function BoardIndexRedirect() {
  const { boards, loading } = useBoards();
  const [searchParams] = useSearchParams();

  if (loading) return null;
  if (boards.length === 0) return null;

  const lastId = localStorage.getItem(LAST_BOARD_KEY);
  const target = boards.find((b) => b.id === lastId) ?? boards[0];
  const suffix = searchParams.toString();

  return <Navigate to={`/board/${target.id}${suffix ? `?${suffix}` : ""}`} replace />;
}
