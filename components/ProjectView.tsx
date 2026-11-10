"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  UserPlus,
  Check,
  Link2,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Cover from "./Cover";
import ProjectDialog from "./ProjectDialog";
import Avatar from "./Avatar";
import FilesTab from "./FilesTab";
import ActivityTab from "./ActivityTab";
import OptionMenu from "./OptionMenu";
import TaskSheet, { REVIEW_BG, STATUS_COLOR, shotSrc, type TaskPatch } from "./TaskSheet";
import { STATUSES, type Member, type Project, type Task, type TaskStatus } from "@/lib/types";
import { getTheme } from "@/lib/themes";
import { areaColor } from "@/lib/areas";
import { participantsOf } from "@/lib/participants";
import { addTask, deleteProject, deleteTask, setTaskArea, setTaskAssignee, setTaskStatus } from "@/app/actions";

const TABS = [
  { id: "tasks", label: "Tareas" },
  { id: "files", label: "Archivos" },
  { id: "activity", label: "Actividad" },
] as const;

function fmt(date?: string) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function ProjectView({
  project,
  members,
  meId,
  backHref = "/",
}: {
  project: Project;
  members: Member[];
  meId: string;
  backHref?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"tasks" | "files" | "activity">("tasks");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [, start] = useTransition();
  const areas = project.areas ?? [];
  const people = participantsOf(project, members);
  const activeFilter = filter && areas.includes(filter) ? filter : null;
  const accent = getTheme(project.theme).accent;
  const openTask = tasks.find((t) => t.id === openId);
  const firstName = (m: Member) => m.name.split(" ")[0];

  function move(taskId: string, status: TaskStatus) {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === taskId && t.status !== status
          ? { ...t, status, reviewBy: status === "review" ? meId : undefined }
          : t,
      ),
    );
    start(() => setTaskStatus(project.id, taskId, status));
  }
  /** Cambios que hace la ficha: se ven al momento; la ficha ya llama al servidor. */
  function update(taskId: string, patch: TaskPatch) {
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }
  function add(status: TaskStatus, title: string, dueDate?: string, area?: string, assignee?: string) {
    const task: Task = { id: crypto.randomUUID(), title, status, dueDate: dueDate || undefined, area, assignee };
    setTasks((ts) => [...ts, task]);
    start(() => addTask(project.id, task));
  }
  function remove(taskId: string) {
    setTasks((ts) => ts.filter((t) => t.id !== taskId));
    if (openId === taskId) setOpenId(null);
    start(() => deleteTask(project.id, taskId));
  }
  function changeArea(t: Task, area: string | null) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, area: area ?? undefined } : x)));
    start(() => setTaskArea(project.id, t.id, area));
  }
  function changeAssignee(t: Task, assignee: string | null) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, assignee: assignee ?? undefined } : x)));
    start(() => setTaskAssignee(project.id, t.id, assignee));
  }
  function next(s: TaskStatus): TaskStatus {
    return s === "todo" ? "doing" : s === "doing" ? "done" : "todo";
  }
  /** El círculo avanza de estado; en Revisar abre la ficha (ahí se aprueba o se piden cambios). */
  function ring(t: Task) {
    if (t.status === "review") setOpenId(t.id);
    else move(t.id, next(t.status));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link
          href={backHref}
          className="grid size-11 place-items-center rounded-full bg-col text-muted hover:bg-soft3"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="grid size-11 place-items-center rounded-full bg-col hover:bg-soft3"
            aria-label="Más opciones"
          >
            <MoreHorizontal size={20} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl bg-surface p-1.5 shadow-card-hover">
                <button
                  onClick={() => { setMenu(false); setEditing(true); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-hov"
                >
                  <Pencil size={16} /> Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${project.name}" y todas sus tareas?`)) start(() => deleteProject(project.id));
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-stretch">
        <Cover theme={project.theme} className="h-40 w-full lg:h-auto lg:w-60 rounded-3xl" />
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight break-words">{project.name}</h1>
          {project.category && <p className="mt-1 text-xl text-muted">{project.category}</p>}
          {project.description && <p className="mt-2 text-muted">{project.description}</p>}
        </div>
        <aside className="rounded-3xl bg-col p-5 lg:w-64 flex flex-row flex-wrap sm:flex-col justify-between sm:justify-center gap-4">
          <div className="flex items-start gap-3">
            <CalendarDays size={22} className="mt-0.5 text-muted" strokeWidth={1.6} />
            <div>
              <p className="text-sm text-muted">Entrega</p>
              <p className="font-semibold">
                {project.dueDate
                  ? new Date(project.dueDate + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
                  : "Sin fecha"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users size={22} className="mt-0.5 text-muted" strokeWidth={1.6} />
            <div>
              <p className="text-sm text-muted">Equipo</p>
              <div className="mt-1 flex -space-x-2">
                {people.length === 0 && <span className="text-sm text-muted">Sin participantes</span>}
                {people.map((m) => (
                  <Avatar key={m.id} member={m} size={36} className="border-2 border-col" />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div className="mt-10 mb-4 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-1 pb-3 transition-colors ${
              tab === t.id ? "font-medium" : "border-transparent text-muted hover:text-foreground"
            }`}
            style={tab === t.id ? { borderColor: accent } : undefined}
          >
            {t.label}
            {t.id === "files" && (project.links?.length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-chip px-1.5 py-0.5 text-xs">{project.links?.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "files" && <FilesTab project={project} members={members} />}
      {tab === "activity" && <ActivityTab project={project} members={members} />}

      {tab === "tasks" && areas.length > 0 && (
        <div className="-mt-1 mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              activeFilter === null ? "bg-ink text-onink" : "bg-chip text-muted hover:bg-chip2"
            }`}
          >
            Todas
          </button>
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setFilter(activeFilter === a ? null : a)}
              className="rounded-full px-3.5 py-1.5 text-sm transition-colors"
              style={
                activeFilter === a
                  ? { background: areaColor(areas, a), color: "#fff" }
                  : { background: `${areaColor(areas, a)}1f`, color: areaColor(areas, a) }
              }
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {tab === "tasks" && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((col) => {
          const colTasks = tasks.filter(
            (t) => t.status === col.id && (!activeFilter || t.area === activeFilter),
          );
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={() => {
                if (dragId) move(dragId, col.id);
                setDragId(null);
                setOverCol(null);
              }}
              className={`rounded-3xl p-3 transition-colors ${overCol === col.id ? "bg-colover" : "bg-col"}`}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <h3 className="font-semibold">{col.label}</h3>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-chip2 px-1.5 text-xs">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {colTasks.map((t) => {
                  const steps = t.steps ?? [];
                  const images = (t.shots ?? []).filter((s) => s.image);
                  const linksOnly = (t.shots ?? []).length - images.length;
                  const reviewers = people.filter((m) => m.id !== t.reviewBy);
                  return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    className={`group flex items-start gap-3 rounded-2xl bg-surface p-3.5 shadow-sm cursor-grab active:cursor-grabbing ${dragId === t.id ? "opacity-40" : ""}`}
                  >
                    <button
                      onClick={() => ring(t)}
                      title={t.status === "review" ? "Abrir para revisar" : "Avanzar de estado"}
                      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors"
                      style={
                        t.status === "todo"
                          ? { borderColor: "var(--edge)" }
                          : t.status === "review"
                            ? { borderColor: STATUS_COLOR.review, color: STATUS_COLOR.review }
                            : { background: STATUS_COLOR[t.status], borderColor: STATUS_COLOR[t.status], color: "#fff" }
                      }
                    >
                      {t.status === "review" ? (
                        <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.review }} />
                      ) : (
                        t.status !== "todo" && <Check size={14} strokeWidth={3} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setOpenId(t.id)}
                        title="Abrir la ficha"
                        className={`block w-full break-words text-left hover:underline hover:decoration-edge hover:underline-offset-4 ${t.status === "done" ? "text-muted line-through" : ""}`}
                      >
                        {t.title}
                      </button>
                      {(steps.length > 0 || t.shots?.length) && (
                        <button
                          type="button"
                          onClick={() => setOpenId(t.id)}
                          className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-muted"
                        >
                          {steps.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ListChecks size={14} /> {steps.filter((s) => s.done).length} de {steps.length}
                            </span>
                          )}
                          {images.length > 0 && (
                            <span className="flex -space-x-1.5">
                              {images.slice(0, 3).map((s) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={s.id}
                                  src={shotSrc(s)}
                                  alt=""
                                  loading="lazy"
                                  className="size-6 rounded-md border-2 border-surface bg-col object-cover object-top"
                                />
                              ))}
                            </span>
                          )}
                          {linksOnly > 0 && (
                            <span className="flex items-center gap-1">
                              <Link2 size={14} /> {linksOnly}
                            </span>
                          )}
                        </button>
                      )}
                      {t.status === "review" && (
                        <p className="mt-2 flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: REVIEW_BG }}>
                          <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR.review }} />
                          {t.reviewBy === meId
                            ? `Le toca a ${reviewers.length === 1 ? firstName(reviewers[0]) : "los demás"}`
                            : "Te toca revisarla"}
                        </p>
                      )}
                      {(t.status === "todo" || t.status === "doing") && t.verdict?.kind === "changes" && (
                        <p className="mt-2 flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: REVIEW_BG }}>
                          <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR.review }} />
                          Cambios pedidos
                        </p>
                      )}
                      {areas.length > 0 && (
                        <div className="mt-1.5 w-fit">
                          <OptionMenu
                            title="Cambiar de parte"
                            selected={t.area && areas.includes(t.area) ? t.area : null}
                            onSelect={(v) => changeArea(t, v)}
                            options={[
                              { value: null, label: "Sin parte", icon: <span className="size-3 rounded-full bg-edge" /> },
                              ...areas.map((a) => ({
                                value: a,
                                label: a,
                                icon: <span className="size-3 rounded-full" style={{ background: areaColor(areas, a) }} />,
                              })),
                            ]}
                            trigger={
                              <span
                                className="block rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={
                                  t.area && areas.includes(t.area)
                                    ? { background: `${areaColor(areas, t.area)}22`, color: areaColor(areas, t.area) }
                                    : { background: "var(--col)", color: "var(--faint)" }
                                }
                              >
                                {t.area && areas.includes(t.area) ? t.area : "Sin parte"}
                              </span>
                            }
                          />
                        </div>
                      )}
                      {t.dueDate && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                          <CalendarDays size={14} /> {fmt(t.dueDate)}
                        </p>
                      )}
                    </div>
                    {people.length > 0 && (
                      <OptionMenu
                        align="right"
                        title={
                          people.find((m) => m.id === t.assignee)
                            ? `Responsable: ${people.find((m) => m.id === t.assignee)?.name}`
                            : "Asignar responsable"
                        }
                        selected={people.some((m) => m.id === t.assignee) ? (t.assignee ?? null) : null}
                        onSelect={(v) => changeAssignee(t, v)}
                        options={[
                          {
                            value: null,
                            label: "Sin asignar",
                            icon: (
                              <span className="grid size-7 place-items-center rounded-full border border-dashed border-edge text-faint">
                                <UserPlus size={14} />
                              </span>
                            ),
                          },
                          ...people.map((m) => ({ value: m.id, label: m.name, icon: <Avatar member={m} size={28} /> })),
                        ]}
                        trigger={
                          people.find((m) => m.id === t.assignee) ? (
                            <Avatar member={people.find((m) => m.id === t.assignee)!} size={28} />
                          ) : (
                            <span className="grid size-7 place-items-center rounded-full border border-dashed border-edge text-faint">
                              <UserPlus size={14} />
                            </span>
                          )
                        }
                      />
                    )}
                    <button
                      onClick={() => {
                        // con ficha, se pregunta: se perderían textos, pasos y capturas
                        const hasSheet = !!(t.brief || t.notes || steps.length || t.shots?.length);
                        if (!hasSheet || confirm(`¿Eliminar «${t.title}» y su ficha?`)) remove(t.id);
                      }}
                      className="text-faint p-1 transition hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                      aria-label="Eliminar tarea"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  );
                })}
                <AddTask
                  areas={areas}
                  people={people}
                  defaultArea={activeFilter ?? undefined}
                  onAdd={(title, date, area, assignee) => add(col.id, title, date, area, assignee)}
                />
              </div>
            </div>
          );
        })}
      </div>
      )}

      {editing && <ProjectDialog project={project} members={members} onClose={() => setEditing(false)} />}
      {openTask && (
        <TaskSheet
          key={openTask.id}
          task={openTask}
          project={project}
          people={people}
          members={members}
          meId={meId}
          onChange={(patch) => update(openTask.id, patch)}
          onDelete={() => remove(openTask.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function AddTask({
  onAdd,
  areas,
  people,
  defaultArea,
}: {
  onAdd: (title: string, date?: string, area?: string, assignee?: string) => void;
  areas: string[];
  people: Member[];
  defaultArea?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [area, setArea] = useState("");
  const [assignee, setAssignee] = useState("");
  const chosenArea = area && areas.includes(area) ? area : (defaultArea ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), date, chosenArea || undefined, people.some((m) => m.id === assignee) ? assignee : undefined);
    setTitle("");
    setDate("");
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-2xl bg-colover py-3 text-muted transition hover:bg-chip2"
      >
        <Plus size={16} /> Añadir tarea
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-sm">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="¿Qué hay que hacer?"
        className="w-full bg-transparent outline-none"
      />
      {areas.length > 0 && (
        <select
          value={chosenArea}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-base text-muted sm:text-sm"
          aria-label="Parte del proyecto"
        >
          <option value="">Sin parte</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}
      {people.length > 0 && (
        <select
          value={people.some((m) => m.id === assignee) ? assignee : ""}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-base text-muted sm:text-sm"
          aria-label="Responsable"
        >
          <option value="">Sin asignar</option>
          {people.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-line px-2 py-1 text-sm text-muted"
        />
        <button type="submit" className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white">
          Añadir
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          Listo
        </button>
      </div>
    </form>
  );
}
