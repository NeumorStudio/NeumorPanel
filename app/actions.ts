"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutateDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { THEME_LIST } from "@/lib/themes";
import type { Project, TaskStatus, ThemeId } from "@/lib/types";

type ProjectInput = {
  name: string;
  category: string;
  description: string;
  theme: ThemeId;
  dueDate?: string;
};

export async function createProject(input: ProjectInput) {
  await requireUser();
  const name = input.name.trim();
  if (!name) return;
  const id = crypto.randomUUID();
  await mutateDB((db) => {
    const project: Project = {
      id,
      name,
      category: input.category.trim(),
      description: input.description.trim(),
      theme: input.theme,
      dueDate: input.dueDate || undefined,
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    db.projects.unshift(project);
  });
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function updateProject(id: string, input: ProjectInput) {
  await requireUser();
  const name = input.name.trim();
  if (!name) return;
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return;
    p.name = name;
    p.category = input.category.trim();
    p.description = input.description.trim();
    p.theme = input.theme;
    p.dueDate = input.dueDate || undefined;
  });
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await requireUser();
  await mutateDB((db) => {
    db.projects = db.projects.filter((p) => p.id !== id);
  });
  revalidatePath("/");
  redirect("/");
}

// Las acciones de tareas no revalidan: la interfaz ya trabaja en optimista.

export async function addTask(
  projectId: string,
  task: { id: string; title: string; status: TaskStatus; dueDate?: string },
) {
  await requireUser();
  await mutateDB((db) => {
    db.projects.find((p) => p.id === projectId)?.tasks.push(task);
  });
}

export async function setTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
) {
  await requireUser();
  await mutateDB((db) => {
    const t = db.projects
      .find((p) => p.id === projectId)
      ?.tasks.find((x) => x.id === taskId);
    if (t) t.status = status;
  });
}

export async function deleteTask(projectId: string, taskId: string) {
  await requireUser();
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (p) p.tasks = p.tasks.filter((t) => t.id !== taskId);
  });
}

export async function saveMembers(members: { id: string; name: string; theme: ThemeId }[]) {
  await requireUser();
  await mutateDB((db) => {
    for (const m of members) {
      const cur = db.members.find((x) => x.id === m.id);
      if (cur) {
        cur.name = m.name.trim() || "Sin nombre";
        cur.theme = m.theme;
      }
    }
  });
  revalidatePath("/", "layout");
}

const GH_USER = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

/** Invita a alguien al equipo por su usuario de GitHub. */
export async function inviteMember(raw: string): Promise<{ error?: string }> {
  await requireUser();
  const login = raw.trim().replace(/^@/, "");
  if (!GH_USER.test(login)) return { error: "Ese usuario de GitHub no es válido." };

  const res = await fetch(`https://api.github.com/users/${login}`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (res.status === 404) return { error: "No existe ese usuario en GitHub." };
  if (!res.ok) return { error: "No se pudo consultar GitHub. Inténtalo de nuevo." };
  const gh = (await res.json()) as { login: string; name: string | null; avatar_url: string };

  const added = await mutateDB((db) => {
    if (db.members.some((m) => m.github?.toLowerCase() === gh.login.toLowerCase())) return false;
    const used = new Set(db.members.map((m) => m.theme));
    const theme = THEME_LIST.find((t) => !used.has(t.id))?.id ?? "purple";
    db.members.push({
      id: crypto.randomUUID(),
      name: gh.name || gh.login,
      theme,
      github: gh.login,
      avatar: gh.avatar_url,
    });
    return true;
  });
  if (!added) return { error: "Esa persona ya está en el equipo." };
  revalidatePath("/", "layout");
  return {};
}

export async function removeMember(id: string): Promise<{ error?: string }> {
  const me = await requireUser();
  if (me.id === id) return { error: "No puedes quitarte a ti mismo." };
  await mutateDB((db) => {
    db.members = db.members.filter((m) => m.id !== id);
  });
  revalidatePath("/", "layout");
  return {};
}
