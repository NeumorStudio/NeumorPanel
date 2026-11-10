"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutateDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { THEME_LIST, normalizeTheme } from "@/lib/themes";
import { normalizeAreas } from "@/lib/areas";
import { participantsOf } from "@/lib/participants";
import { projectPath, sectionPath } from "@/lib/paths";
import { MAX_SHOT_BYTES, deleteShots, isShotType, saveShot } from "@/lib/shots";
import {
  STATUSES,
  type ActivityType,
  type DB,
  type Project,
  type TaskShot,
  type TaskStatus,
  type ThemeId,
} from "@/lib/types";

type ProjectInput = {
  name: string;
  category: string;
  description: string;
  theme: string;
  dueDate?: string;
  areas?: string[];
  members?: string[];
  kind?: "client" | "lab"; // solo se usa al crear
};

/** Un proyecto vive en /projects/[id] (clientes) o en /lab/[id]: se refrescan ambas. */
function revalidateProject(id: string) {
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/lab/${id}`);
}

const MAX_ACTIVITY = 200;

/** Solo ids que existen en el equipo; si no se indica lista, todo el equipo. */
function validIds(team: { id: string }[], ids?: string[]): string[] {
  const all = team.map((m) => m.id);
  return ids ? all.filter((id) => ids.includes(id)) : all;
}
const statusLabel = (s: TaskStatus) => STATUSES.find((x) => x.id === s)?.label ?? s;

/** Añade una entrada al historial del proyecto (la más reciente primero). */
function log(p: Project, by: string, type: ActivityType, text: string) {
  p.activity = [
    { id: crypto.randomUUID(), type, text, by, at: new Date().toISOString() },
    ...(p.activity ?? []),
  ].slice(0, MAX_ACTIVITY);
}

/** Igual que log(), pero no repite la misma entrada de la misma persona en 15 minutos
 *  (la ficha se guarda sola al escribir: sin esto, la Actividad se llenaría). */
function logOnce(p: Project, by: string, type: ActivityType, text: string) {
  const last = p.activity?.[0];
  if (last && last.by === by && last.text === text && Date.now() - Date.parse(last.at) < 15 * 60_000) return;
  log(p, by, type, text);
}

const isStatus = (s: unknown): s is TaskStatus => STATUSES.some((x) => x.id === s);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT = 4000;
const MAX_STEPS = 30;
const MAX_SHOTS = 12;

function findTask(db: DB, projectId: string, taskId: string) {
  const p = db.projects.find((x) => x.id === projectId);
  const t = p?.tasks.find((x) => x.id === taskId);
  return p && t ? { p, t } : null;
}

export async function createProject(input: ProjectInput) {
  const me = await requireUser();
  const name = input.name.trim();
  if (!name) return;
  const id = crypto.randomUUID();
  await mutateDB((db) => {
    const project: Project = {
      id,
      name,
      category: input.category.trim(),
      description: input.description.trim(),
      kind: input.kind === "lab" ? "lab" : undefined,
      theme: normalizeTheme(input.theme),
      dueDate: input.dueDate || undefined,
      areas: normalizeAreas(input.areas),
      members: validIds(db.members, input.members),
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    log(project, me.id, "project", "creó el proyecto");
    db.projects.unshift(project);
  });
  revalidatePath("/");
  revalidatePath("/lab");
  redirect(projectPath({ id, kind: input.kind === "lab" ? "lab" : undefined }));
}

export async function updateProject(id: string, input: ProjectInput) {
  const me = await requireUser();
  const name = input.name.trim();
  if (!name) return;
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return;
    const changes: string[] = [];
    if (p.name !== name) changes.push(`renombró el proyecto a «${name}»`);
    if ((p.dueDate ?? "") !== (input.dueDate ?? "")) {
      changes.push(input.dueDate ? `cambió la fecha de entrega al ${input.dueDate}` : "quitó la fecha de entrega");
    }
    if (changes.length === 0) changes.push("editó el proyecto");
    p.name = name;
    p.category = input.category.trim();
    p.description = input.description.trim();
    p.theme = normalizeTheme(input.theme);
    p.dueDate = input.dueDate || undefined;
    if (input.areas) {
      const before = (p.areas ?? []).join("|");
      p.areas = normalizeAreas(input.areas);
      // las tareas de una parte eliminada se quedan sin etiqueta
      for (const t of p.tasks) if (t.area && !p.areas.includes(t.area)) delete t.area;
      if (before !== p.areas.join("|") && changes[0] === "editó el proyecto") changes[0] = "cambió las partes del proyecto";
    }
    if (input.members) {
      const before = participantsOf(p, db.members).map((m) => m.id).sort().join("|");
      p.members = validIds(db.members, input.members);
      // las tareas de quien deja el proyecto se quedan sin responsable
      for (const t of p.tasks) if (t.assignee && !p.members.includes(t.assignee)) delete t.assignee;
      if (before !== [...p.members].sort().join("|")) changes.push("cambió los participantes del proyecto");
    }
    if (changes.length > 1 && changes[0] === "editó el proyecto") changes.shift();
    for (const c of changes) log(p, me.id, "project", c);
  });
  revalidatePath("/");
  revalidatePath("/lab");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/lab/${id}`);
}

export async function deleteProject(id: string) {
  await requireUser();
  const { kind, images } = await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === id);
    db.projects = db.projects.filter((x) => x.id !== id);
    return { kind: p?.kind, images: p?.tasks.flatMap((t) => t.shots ?? []).map((s) => s.image) ?? [] };
  });
  await deleteShots(images);
  revalidatePath("/");
  revalidatePath("/lab");
  redirect(sectionPath(kind));
}

// En las tareas la interfaz ya es optimista; se revalida solo para que
// la pestaña Actividad se actualice.

export async function addTask(
  projectId: string,
  task: { id: string; title: string; status: TaskStatus; dueDate?: string; area?: string; assignee?: string },
) {
  const me = await requireUser();
  const title = task.title.trim();
  if (!title || !isStatus(task.status)) return;
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return;
    const area = task.area && p.areas?.includes(task.area) ? task.area : undefined;
    const assignee = participantsOf(p, db.members).find((m) => m.id === task.assignee)?.id;
    p.tasks.push({
      id: task.id,
      title,
      status: task.status,
      dueDate: task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : undefined,
      area,
      assignee,
      reviewBy: task.status === "review" ? me.id : undefined,
    });
    log(p, me.id, "task", `creó la tarea «${title}»`);
  });
  revalidateProject(projectId);
}

export async function setTaskStatus(projectId: string, taskId: string, status: TaskStatus) {
  const me = await requireUser();
  if (!isStatus(status)) return;
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    if (!found || found.t.status === status) return;
    const { p, t } = found;
    t.status = status;
    // Pasarla a Revisar es pedir el OK a los demás; sacarla de ahí lo retira.
    if (status === "review") t.reviewBy = me.id;
    else delete t.reviewBy;
    log(
      p,
      me.id,
      "task",
      status === "review"
        ? `pidió el OK de «${t.title}»`
        : status === "done"
          ? `completó «${t.title}»`
          : `movió «${t.title}» a ${statusLabel(status)}`,
    );
  });
  revalidateProject(projectId);
}

/** Aprobar: la tarea pasa a Hecho y el OK queda apuntado en la ficha. */
export async function approveTask(projectId: string, taskId: string) {
  const me = await requireUser();
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    // el OK lo da otro: quien pidió la revisión no se aprueba a sí mismo
    if (!found || found.t.status !== "review" || found.t.reviewBy === me.id) return;
    const { p, t } = found;
    t.status = "done";
    delete t.reviewBy;
    t.verdict = { kind: "ok", by: me.id, at: new Date().toISOString() };
    log(p, me.id, "task", `aprobó «${t.title}»`);
  });
  revalidateProject(projectId);
}

/** Pedir cambios: vuelve a En curso con una línea de por qué, que se queda en la ficha. */
export async function requestChanges(projectId: string, taskId: string, rawNote: string) {
  const me = await requireUser();
  const note = rawNote.trim().slice(0, 500) || undefined;
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    if (!found || found.t.status !== "review" || found.t.reviewBy === me.id) return;
    const { p, t } = found;
    t.status = "doing";
    delete t.reviewBy;
    t.verdict = { kind: "changes", note, by: me.id, at: new Date().toISOString() };
    log(p, me.id, "task", note ? `pidió cambios en «${t.title}»: ${note.slice(0, 140)}` : `pidió cambios en «${t.title}»`);
  });
  revalidateProject(projectId);
}

/** Textos de la ficha: quién lo pidió, lo que pidió y lo que hay. Solo cambia lo que llega. */
export async function updateTaskBrief(
  projectId: string,
  taskId: string,
  input: { briefFrom?: string; brief?: string; notes?: string },
) {
  const me = await requireUser();
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    if (!found) return;
    const { p, t } = found;
    let changed = false;
    for (const key of ["briefFrom", "brief", "notes"] as const) {
      const raw = input[key];
      if (typeof raw !== "string") continue;
      const value = raw.trim().slice(0, key === "briefFrom" ? 60 : MAX_TEXT) || undefined;
      if ((t[key] ?? "") === (value ?? "")) continue;
      t[key] = value;
      changed = true;
    }
    if (changed) logOnce(p, me.id, "task", `actualizó la ficha de «${t.title}»`);
  });
  revalidateProject(projectId);
}

export async function addTaskStep(projectId: string, taskId: string, step: { id: string; text: string }) {
  const me = await requireUser();
  const text = step.text.trim().slice(0, 200);
  if (!text) return;
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    if (!found || (found.t.steps?.length ?? 0) >= MAX_STEPS) return;
    const { p, t } = found;
    t.steps = [...(t.steps ?? []), { id: UUID.test(step.id) ? step.id : crypto.randomUUID(), text, done: false }];
    logOnce(p, me.id, "task", `actualizó los pasos de «${t.title}»`);
  });
  revalidateProject(projectId);
}

export async function setTaskStepDone(projectId: string, taskId: string, stepId: string, done: boolean) {
  const me = await requireUser();
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    const s = found?.t.steps?.find((x) => x.id === stepId);
    if (!found || !s || s.done === !!done) return;
    s.done = !!done;
    if (s.done) log(found.p, me.id, "task", `marcó «${s.text}» en «${found.t.title}»`);
  });
  revalidateProject(projectId);
}

export async function deleteTaskStep(projectId: string, taskId: string, stepId: string) {
  const me = await requireUser();
  await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    if (!found?.t.steps?.some((x) => x.id === stepId)) return;
    const { p, t } = found;
    t.steps = t.steps?.filter((x) => x.id !== stepId);
    if (t.steps?.length === 0) delete t.steps;
    logOnce(p, me.id, "task", `actualizó los pasos de «${t.title}»`);
  });
  revalidateProject(projectId);
}

/**
 * Añade un resultado a la ficha: una captura, un enlace o los dos.
 * Llega como FormData: label, url y image (ya comprimida en el navegador).
 */
export async function addTaskShot(
  projectId: string,
  taskId: string,
  form: FormData,
): Promise<{ error?: string; shot?: TaskShot }> {
  const me = await requireUser();
  const rawUrl = String(form.get("url") ?? "");
  const url = rawUrl.trim() ? normalizeUrl(rawUrl) : undefined;
  if (url === null) return { error: "Ese enlace no es válido (por ejemplo https://instagram.com/…)." };
  const file = form.get("image");
  const image = file instanceof Blob && file.size > 0 ? file : undefined;
  if (!url && !image) return { error: "Añade una captura, un enlace o los dos." };
  if (image && !isShotType(image.type)) return { error: "La captura tiene que ser una imagen (PNG, JPG o WebP)." };
  if (image && image.size > MAX_SHOT_BYTES) return { error: "La captura pesa demasiado." };
  const label =
    String(form.get("label") ?? "").trim().slice(0, 60) || (url ? new URL(url).hostname.replace(/^www\./, "") : "Captura");

  let pathname: string | undefined;
  if (image) {
    try {
      pathname = await saveShot(image);
    } catch (e) {
      console.error("No se pudo guardar la captura", e);
      return { error: "No se pudo guardar la captura. ¿Está conectado el almacén de archivos?" };
    }
  }
  const shot: TaskShot = { id: crypto.randomUUID(), label, url, image: pathname, by: me.id, at: new Date().toISOString() };
  const saved = await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    if (!found || (found.t.shots?.length ?? 0) >= MAX_SHOTS) return false;
    const { p, t } = found;
    t.shots = [...(t.shots ?? []), shot];
    log(p, me.id, "task", image ? `añadió una captura a «${t.title}»` : `añadió el enlace «${label}» a «${t.title}»`);
    return true;
  });
  if (!saved) {
    await deleteShots([pathname]);
    return { error: `No se pudo añadir (máximo ${MAX_SHOTS} por tarea).` };
  }
  revalidateProject(projectId);
  return { shot };
}

export async function deleteTaskShot(projectId: string, taskId: string, shotId: string) {
  const me = await requireUser();
  const image = await mutateDB((db) => {
    const found = findTask(db, projectId, taskId);
    const s = found?.t.shots?.find((x) => x.id === shotId);
    if (!found || !s) return undefined;
    const { p, t } = found;
    t.shots = t.shots?.filter((x) => x.id !== shotId);
    if (t.shots?.length === 0) delete t.shots;
    log(p, me.id, "task", s.image ? `quitó una captura de «${t.title}»` : `quitó el enlace «${s.label}» de «${t.title}»`);
    return s.image;
  });
  await deleteShots([image]);
  revalidateProject(projectId);
}

export async function setTaskArea(projectId: string, taskId: string, area: string | null) {
  await requireUser();
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    const t = p?.tasks.find((x) => x.id === taskId);
    if (!p || !t) return;
    if (area && p.areas?.includes(area)) t.area = area;
    else delete t.area;
  });
  revalidateProject(projectId);
}

export async function setTaskAssignee(projectId: string, taskId: string, assignee: string | null) {
  const me = await requireUser();
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    const t = p?.tasks.find((x) => x.id === taskId);
    if (!p || !t) return;
    const who = participantsOf(p, db.members).find((m) => m.id === assignee);
    if (who) {
      t.assignee = who.id;
      log(p, me.id, "task", `asignó «${t.title}» a ${who.name}`);
    } else if (t.assignee) {
      delete t.assignee;
      log(p, me.id, "task", `quitó el responsable de «${t.title}»`);
    }
  });
  revalidateProject(projectId);
}

export async function updateTask(
  projectId: string,
  taskId: string,
  input: { title: string; dueDate?: string },
) {
  const me = await requireUser();
  const title = input.title.trim().slice(0, 200);
  if (!title) return;
  const dueDate = input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ? input.dueDate : undefined;
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    const t = p?.tasks.find((x) => x.id === taskId);
    if (!p || !t) return;
    const oldTitle = t.title;
    if (t.title !== title) {
      t.title = title;
      log(p, me.id, "task", `renombró «${oldTitle}» a «${title}»`);
    }
    if ((t.dueDate ?? "") !== (dueDate ?? "")) {
      t.dueDate = dueDate;
      log(p, me.id, "task", dueDate ? `cambió la fecha de «${title}» al ${dueDate}` : `quitó la fecha de «${title}»`);
    }
  });
  revalidateProject(projectId);
}

export async function deleteTask(projectId: string, taskId: string) {
  const me = await requireUser();
  const images = await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    const t = p?.tasks.find((x) => x.id === taskId);
    if (!p || !t) return [];
    p.tasks = p.tasks.filter((x) => x.id !== taskId);
    log(p, me.id, "task", `eliminó la tarea «${t.title}»`);
    return (t.shots ?? []).map((s) => s.image);
  });
  await deleteShots(images);
  revalidateProject(projectId);
}

/** Acepta "figma.com/x" o "https://…". Solo http(s). */
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function addLink(projectId: string, title: string, rawUrl: string): Promise<{ error?: string }> {
  const me = await requireUser();
  const url = normalizeUrl(rawUrl);
  if (!url) return { error: "Escribe un enlace válido (por ejemplo https://figma.com/…)." };
  const name = title.trim() || new URL(url).hostname.replace(/^www\./, "");
  const found = await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return false;
    p.links = [
      ...(p.links ?? []),
      { id: crypto.randomUUID(), title: name.slice(0, 120), url, by: me.id, at: new Date().toISOString() },
    ];
    log(p, me.id, "link", `añadió el enlace «${name.slice(0, 120)}»`);
    return true;
  });
  if (!found) return { error: "No se encontró el proyecto." };
  revalidateProject(projectId);
  return {};
}

export async function deleteLink(projectId: string, linkId: string) {
  const me = await requireUser();
  await mutateDB((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    const l = p?.links?.find((x) => x.id === linkId);
    if (!p || !l) return;
    p.links = p.links?.filter((x) => x.id !== linkId);
    log(p, me.id, "link", `eliminó el enlace «${l.title}»`);
  });
  revalidateProject(projectId);
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
    for (const p of db.projects) {
      if (p.members) p.members = p.members.filter((x) => x !== id);
      for (const t of p.tasks) if (t.assignee === id) delete t.assignee;
    }
  });
  revalidatePath("/", "layout");
  return {};
}
