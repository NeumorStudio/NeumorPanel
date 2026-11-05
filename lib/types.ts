export type TaskStatus = "todo" | "doing" | "done";

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "Por hacer" },
  { id: "doing", label: "En curso" },
  { id: "done", label: "Hecho" },
];

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string; // YYYY-MM-DD
};

export type ThemeId = "blue" | "orange" | "green" | "purple" | "pink" | "teal";

export type Project = {
  id: string;
  name: string;
  category: string;
  description: string;
  theme: ThemeId;
  dueDate?: string;
  tasks: Task[];
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  theme: ThemeId;
  github?: string; // usuario de GitHub (con él se inicia sesión)
  avatar?: string; // foto de GitHub
};

export type DB = {
  members: Member[];
  projects: Project[];
};

export function progressOf(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(
    (tasks.filter((t) => t.status === "done").length / tasks.length) * 100,
  );
}
