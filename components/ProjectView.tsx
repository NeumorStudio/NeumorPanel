"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, MoreHorizontal, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import Cover from "./Cover";
import ProgressBar from "./ProgressBar";
import ProjectDialog from "./ProjectDialog";
import Avatar from "./Avatar";
import FilesTab from "./FilesTab";
import ActivityTab from "./ActivityTab";
import { STATUSES, progressOf, type Member, type Project, type Task, type TaskStatus } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { addTask, deleteProject, deleteTask, setTaskStatus } from "@/app/actions";

const TABS = [
  { id: "tasks", label: "Tareas" },
  { id: "files", label: "Archivos" },
  { id: "activity", label: "Actividad" },
] as const;

function fmt(date?: string) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function ProjectView({ project, members }: { project: Project; members: Member[] }) {
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"tasks" | "files" | "activity">("tasks");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [, start] = useTransition();
  const accent = THEMES[project.theme].accent;

  function move(taskId: string, status: TaskStatus) {
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
    start(() => setTaskStatus(project.id, taskId, status));
  }
  function add(status: TaskStatus, title: string, dueDate?: string) {
    const task: Task = { id: crypto.randomUUID(), title, status, dueDate: dueDate || undefined };
    setTasks((ts) => [...ts, task]);
    start(() => addTask(project.id, task));
  }
  function remove(taskId: string) {
    setTasks((ts) => ts.filter((t) => t.id !== taskId));
    start(() => deleteTask(project.id, taskId));
  }
  function next(s: TaskStatus): TaskStatus {
    return s === "todo" ? "doing" : s === "doing" ? "done" : "todo";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="grid size-11 place-items-center rounded-full bg-[#eef0f6] text-muted hover:bg-[#e3e5ef]"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="grid size-11 place-items-center rounded-full bg-[#eef0f6] hover:bg-[#e3e5ef]"
            aria-label="Más opciones"
          >
            <MoreHorizontal size={20} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl bg-white p-1.5 shadow-card-hover">
                <button
                  onClick={() => { setMenu(false); setEditing(true); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-[#f3f4f9]"
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
          <div className="mt-4 max-w-md">
            <ProgressBar value={progressOf(tasks)} theme={project.theme} />
          </div>
        </div>
        <aside className="rounded-3xl bg-[#eff0f6] p-5 lg:w-64 flex flex-row flex-wrap sm:flex-col justify-between sm:justify-center gap-4">
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
                {members.map((m) => (
                  <Avatar key={m.id} member={m} size={36} className="border-2 border-[#eff0f6]" />
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
              <span className="ml-2 rounded-full bg-[#e8eaf3] px-1.5 py-0.5 text-xs">{project.links?.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "files" && <FilesTab project={project} members={members} />}
      {tab === "activity" && <ActivityTab project={project} members={members} />}

      {tab === "tasks" && (
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
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
              className={`rounded-3xl p-3 transition-colors ${overCol === col.id ? "bg-[#e4e7f3]" : "bg-[#eff0f6]"}`}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <h3 className="font-semibold">{col.label}</h3>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#dfe1ec] px-1.5 text-xs">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    className={`group flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-sm cursor-grab active:cursor-grabbing ${dragId === t.id ? "opacity-40" : ""}`}
                  >
                    <button
                      onClick={() => move(t.id, next(t.status))}
                      title="Avanzar de estado"
                      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors"
                      style={
                        t.status === "done"
                          ? { background: "#34c26b", borderColor: "#34c26b", color: "#fff" }
                          : t.status === "doing"
                            ? { background: "#2f6bff", borderColor: "#2f6bff", color: "#fff" }
                            : { borderColor: "#c4c7d6" }
                      }
                    >
                      {t.status !== "todo" && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={t.status === "done" ? "text-muted line-through" : ""}>{t.title}</p>
                      {t.dueDate && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                          <CalendarDays size={14} /> {fmt(t.dueDate)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(t.id)}
                      className="text-[#b6b9c9] p-1 transition hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                      aria-label="Eliminar tarea"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <AddTask onAdd={(title, date) => add(col.id, title, date)} />
              </div>
            </div>
          );
        })}
      </div>
      )}

      {editing && <ProjectDialog project={project} onClose={() => setEditing(false)} />}
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string, date?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), date);
    setTitle("");
    setDate("");
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-2xl bg-[#e4e6f1] py-3 text-muted transition hover:bg-[#dcdfec]"
      >
        <Plus size={16} /> Añadir tarea
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="¿Qué hay que hacer?"
        className="w-full bg-transparent outline-none"
      />
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
