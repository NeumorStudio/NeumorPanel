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
  area?: string; // una de las partes del proyecto (p. ej. "Web", "Cliente")
  assignee?: string; // id del miembro responsable
};

export type ThemeId = "blue" | "orange" | "green" | "purple" | "pink" | "teal";

export type ProjectLink = {
  id: string;
  title: string;
  url: string;
  by: string; // id del miembro que lo añadió
  at: string; // ISO
};

export type ActivityType = "project" | "task" | "link";

export type Activity = {
  id: string;
  type: ActivityType;
  text: string; // p. ej. «movió “Diseñar” a Hecho»
  by: string; // id del miembro
  at: string; // ISO
};

export type Project = {
  id: string;
  name: string;
  category: string;
  description: string;
  theme: string; // preset ("blue") o color personalizado ("#8a3ffc")
  dueDate?: string;
  tasks: Task[];
  areas?: string[]; // partes del proyecto, para etiquetar tareas
  members?: string[]; // ids de los participantes (si falta: todo el equipo)
  links?: ProjectLink[];
  activity?: Activity[]; // la más reciente primero
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
