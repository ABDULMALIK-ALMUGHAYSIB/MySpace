import type { PriorityValue, StatusValue } from "./task-meta";

export type NotesType = "note" | "steps";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  notes_type: NotesType;
  steps: string[];
  priority: PriorityValue;
  status: StatusValue;
  due_date: string | null;
  requester_name: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};
