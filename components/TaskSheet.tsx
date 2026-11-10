"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Check, ExternalLink, ImagePlus, Link2, Plus, Trash2, X } from "lucide-react";
import Avatar from "./Avatar";
import RelativeTime from "./RelativeTime";
import { areaColor } from "@/lib/areas";
import { compressImage } from "@/lib/compress";
import { STATUSES, type Member, type Project, type Task, type TaskShot } from "@/lib/types";
import {
  addTaskShot,
  addTaskStep,
  approveTask,
  deleteTaskShot,
  deleteTaskStep,
  requestChanges,
  setTaskStatus,
  setTaskStepDone,
  updateTask,
  updateTaskBrief,
} from "@/app/actions";

/** Color de la columna Revisar (también lo usan las tarjetas). */
export const REVIEW = "#f59e0b";
export const REVIEW_BG = "rgba(245, 158, 11, 0.14)";
export const STATUS_COLOR: Record<Task["status"], string> = {
  todo: "var(--edge)",
  doing: "#2f6bff",
  review: REVIEW,
  done: "#34c26b",
};

export const shotSrc = (s: Pick<TaskShot, "id">) => `/api/capturas/${s.id}`;

const FIELD =
  "w-full rounded-xl border border-line bg-field px-3.5 py-2.5 text-base sm:text-[15px] outline-none focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10";

type Section = "brief" | "notes" | "steps";
export type TaskPatch = Partial<Task> | ((t: Task) => Partial<Task>);

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Ficha de una tarea: se abre al pulsarla. Todo es opcional; una tarea sencilla
 * se queda en título y fecha. Lo que se escribe se guarda solo al salir del campo.
 */
export default function TaskSheet({
  task,
  project,
  people,
  members,
  meId,
  onChange,
  onDelete,
  onClose,
}: {
  task: Task;
  project: Pick<Project, "id" | "name" | "areas">;
  people: Member[]; // participantes del proyecto
  members: Member[]; // todo el equipo (para los nombres)
  meId: string;
  onChange: (patch: TaskPatch) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [, start] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [extra, setExtra] = useState<Section[]>([]);
  const [shotForm, setShotForm] = useState(false);
  const [viewing, setViewing] = useState<TaskShot | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState("");
  const [stepDraft, setStepDraft] = useState("");

  const firstName = (id?: string) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Alguien";
  const names = (list: Member[]) =>
    list.length === 0 ? "nadie" : list.length === 1 ? list[0].name.split(" ")[0] : "los demás";
  const assignee = people.find((m) => m.id === task.assignee);
  const areas = project.areas ?? [];
  const area = task.area && areas.includes(task.area) ? task.area : null;
  const steps = task.steps ?? [];
  const shots = task.shots ?? [];
  const images = shots.filter((s) => s.image);
  const links = shots.filter((s) => !s.image);
  const othersForMe = people.filter((m) => m.id !== meId);
  const reviewers = people.filter((m) => m.id !== task.reviewBy);
  const mineInReview = task.status === "review" && task.reviewBy === meId;

  const has = {
    brief: !!(task.brief || task.briefFrom) || extra.includes("brief"),
    notes: !!task.notes || extra.includes("notes"),
    steps: steps.length > 0 || extra.includes("steps"),
    shots: shots.length > 0 || shotForm,
  };
  const open = (s: Section) => setExtra((x) => (x.includes(s) ? x : [...x, s]));

  /** Antes de cerrar, quita el foco: así se guarda el campo que se estaba escribiendo. */
  function close() {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose();
  }

  // Escape cierra la captura ampliada o, si no hay, la ficha. El fondo no se desplaza.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (viewing) setViewing(null);
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ---------- Título y fecha ----------
  function saveTitle() {
    const value = title.trim();
    if (!value) return setTitle(task.title);
    if (value === task.title) return;
    onChange({ title: value });
    start(() => updateTask(project.id, task.id, { title: value, dueDate: task.dueDate }));
  }
  function saveDate(dueDate: string) {
    onChange({ dueDate: dueDate || undefined });
    start(() => updateTask(project.id, task.id, { title: task.title, dueDate: dueDate || undefined }));
  }

  // ---------- Textos de la ficha ----------
  function saveBrief(patch: { briefFrom?: string; brief?: string; notes?: string }) {
    const clean: Partial<Task> = {};
    for (const key of ["briefFrom", "brief", "notes"] as const) {
      if (key in patch) clean[key] = patch[key]?.trim() || undefined;
    }
    onChange(clean);
    start(() => updateTaskBrief(project.id, task.id, patch));
  }

  // ---------- Pasos ----------
  function addStep(e: React.FormEvent) {
    e.preventDefault();
    const text = stepDraft.trim();
    if (!text) return;
    const step = { id: crypto.randomUUID(), text, done: false };
    onChange((t) => ({ steps: [...(t.steps ?? []), step] }));
    setStepDraft("");
    start(() => addTaskStep(project.id, task.id, step));
  }
  function toggleStep(id: string, done: boolean) {
    onChange((t) => ({ steps: t.steps?.map((s) => (s.id === id ? { ...s, done } : s)) }));
    start(() => setTaskStepDone(project.id, task.id, id, done));
  }
  function removeStep(id: string) {
    onChange((t) => ({ steps: t.steps?.filter((s) => s.id !== id) }));
    start(() => deleteTaskStep(project.id, task.id, id));
  }

  // ---------- Resultado ----------
  async function addShot(form: FormData): Promise<string | undefined> {
    const res = await addTaskShot(project.id, task.id, form);
    const shot = res.shot;
    if (shot) onChange((t) => ({ shots: [...(t.shots ?? []), shot] }));
    return res.error;
  }
  function removeShot(s: TaskShot) {
    if (!confirm(s.image ? "¿Quitar esta captura?" : `¿Quitar el enlace «${s.label}»?`)) return;
    onChange((t) => ({ shots: t.shots?.filter((x) => x.id !== s.id) }));
    start(() => deleteTaskShot(project.id, task.id, s.id));
  }

  // ---------- Revisión ----------
  function askReview() {
    onChange({ status: "review", reviewBy: meId });
    start(() => setTaskStatus(project.id, task.id, "review"));
  }
  function backToDoing() {
    onChange({ status: "doing", reviewBy: undefined });
    start(() => setTaskStatus(project.id, task.id, "doing"));
  }
  function approve() {
    onChange({ status: "done", reviewBy: undefined, verdict: { kind: "ok", by: meId, at: new Date().toISOString() } });
    start(() => approveTask(project.id, task.id));
  }
  function sendChanges(e: React.FormEvent) {
    e.preventDefault();
    const note = changesNote.trim() || undefined;
    onChange({
      status: "doing",
      reviewBy: undefined,
      verdict: { kind: "changes", note, by: meId, at: new Date().toISOString() },
    });
    setChangesOpen(false);
    setChangesNote("");
    start(() => requestChanges(project.id, task.id, note ?? ""));
  }

  const statusLabel = STATUSES.find((s) => s.id === task.status)?.label;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex min-h-full items-start justify-center p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div role="dialog" aria-modal="true" aria-label={task.title} className="w-full max-w-2xl rounded-3xl bg-surface shadow-2xl">
          {/* Cabecera */}
          <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-col px-2.5 py-0.5 font-medium">
                <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[task.status] }} />
                {statusLabel}
              </span>
              {area && (
                <span
                  className="rounded-full px-2.5 py-0.5 font-medium"
                  style={{ background: `${areaColor(areas, area)}22`, color: areaColor(areas, area) }}
                >
                  {area}
                </span>
              )}
              <span className="truncate text-muted">{project.name}</span>
            </div>
            {assignee && <Avatar member={assignee} size={30} />}
            <button
              type="button"
              onClick={close}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-soft"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pb-5 pt-2 sm:px-6">
            <textarea
              value={title}
              rows={1}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                e.currentTarget.blur();
              }}
              aria-label="Título de la tarea"
              className="-mx-2 w-[calc(100%+1rem)] resize-none rounded-xl border border-transparent bg-transparent px-2 py-1 text-2xl font-bold tracking-tight outline-none [field-sizing:content] hover:border-line focus:border-primary"
            />
            <label className="mt-1 flex w-fit items-center gap-2 text-sm text-muted">
              <CalendarDays size={15} />
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) => saveDate(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-muted"
                aria-label="Fecha"
              />
            </label>

            {/* Revisión */}
            {task.status === "review" && !mineInReview && (
              <div className="mt-4 rounded-2xl p-4" style={{ background: REVIEW_BG }}>
                <p>
                  <b>{firstName(task.reviewBy)} pide tu OK.</b>{" "}
                  <span className="text-muted">Si algo no te convence, pide cambios con una línea.</span>
                </p>
                {changesOpen ? (
                  <form onSubmit={sendChanges} className="mt-3 flex flex-col gap-2">
                    <textarea
                      autoFocus
                      rows={2}
                      value={changesNote}
                      onChange={(e) => setChangesNote(e.target.value)}
                      placeholder="¿Qué cambiarías?"
                      className={`${FIELD} resize-none`}
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setChangesOpen(false)} className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-hov">
                        Cancelar
                      </button>
                      <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-onink">Enviar</button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setChangesOpen(true)}
                      className="rounded-xl bg-surface px-4 py-2 text-sm font-medium shadow-sm hover:bg-hov"
                    >
                      Pedir cambios
                    </button>
                    <button
                      type="button"
                      onClick={approve}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110"
                    >
                      <Check size={16} strokeWidth={2.5} /> Aprobar
                    </button>
                  </div>
                )}
              </div>
            )}
            {mineInReview && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl p-4" style={{ background: REVIEW_BG }}>
                <p className="flex-1">
                  Esperando el OK de <b>{names(reviewers)}</b>.
                </p>
                <button type="button" onClick={backToDoing} className="text-sm text-muted underline-offset-2 hover:underline">
                  Volver a En curso
                </button>
              </div>
            )}
            {task.verdict?.kind === "changes" && (task.status === "todo" || task.status === "doing") && (
              <div className="mt-4 rounded-2xl p-4" style={{ background: REVIEW_BG }}>
                <p className="text-sm">
                  <b>{firstName(task.verdict.by)} pidió cambios</b>{" "}
                  <span className="text-muted">
                    <RelativeTime iso={task.verdict.at} />
                  </span>
                </p>
                {task.verdict.note && <p className="mt-1 whitespace-pre-line">{task.verdict.note}</p>}
              </div>
            )}
            {task.verdict?.kind === "ok" && task.status === "done" && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <Check size={15} strokeWidth={2.5} style={{ color: STATUS_COLOR.done }} />
                Aprobada por {firstName(task.verdict.by)} · <RelativeTime iso={task.verdict.at} />
              </p>
            )}
          </div>

          {/* Lo que pidió */}
          {has.brief && (
            <section className="border-t border-line px-5 py-5 sm:px-6">
              <h3 className="mb-2 flex flex-wrap items-baseline gap-x-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Lo que pidió
                <input
                  defaultValue={task.briefFrom ?? ""}
                  onBlur={(e) => e.target.value.trim() !== (task.briefFrom ?? "") && saveBrief({ briefFrom: e.target.value })}
                  placeholder="el cliente"
                  aria-label="Quién lo pidió"
                  className="min-w-0 border-b border-dashed border-edge bg-transparent font-semibold uppercase tracking-wider text-foreground outline-none placeholder:text-faint focus:border-primary [field-sizing:content]"
                />
              </h3>
              <AutoText
                value={task.brief}
                autoFocus={!task.brief && extra.includes("brief")}
                placeholder="Sus palabras, tal cual, en tres o cuatro líneas."
                onSave={(v) => saveBrief({ brief: v })}
              />
            </section>
          )}

          {/* Lo que hay */}
          {has.notes && (
            <section className="border-t border-line px-5 py-5 sm:px-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Lo que hay</h3>
              <AutoText
                value={task.notes}
                autoFocus={!task.notes && extra.includes("notes")}
                placeholder="Lo que ya está hecho y dónde (rama, preview, fecha…)."
                onSave={(v) => saveBrief({ notes: v })}
              />
            </section>
          )}

          {/* Pasos */}
          {has.steps && (
            <section className="border-t border-line px-5 py-5 sm:px-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Pasos
                {steps.length > 0 && (
                  <span className="ml-2 normal-case tracking-normal">
                    {steps.filter((s) => s.done).length} de {steps.length}
                  </span>
                )}
              </h3>
              <ul className="flex flex-col">
                {steps.map((s) => (
                  <li key={s.id} className="group flex items-start gap-3 rounded-xl px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => toggleStep(s.id, !s.done)}
                      aria-label={s.done ? "Desmarcar paso" : "Marcar paso"}
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors"
                      style={
                        s.done
                          ? { background: STATUS_COLOR.done, borderColor: STATUS_COLOR.done, color: "#fff" }
                          : { borderColor: "var(--edge)" }
                      }
                    >
                      {s.done && <Check size={13} strokeWidth={3} />}
                    </button>
                    <span className={`min-w-0 flex-1 break-words ${s.done ? "text-muted line-through" : ""}`}>{s.text}</span>
                    <button
                      type="button"
                      onClick={() => removeStep(s.id)}
                      aria-label="Quitar paso"
                      className="p-1 text-faint hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={addStep} className="mt-1 flex items-center gap-3 px-1">
                <Plus size={18} className="ml-0.5 shrink-0 text-faint" />
                <input
                  autoFocus={steps.length === 0}
                  value={stepDraft}
                  onChange={(e) => setStepDraft(e.target.value)}
                  placeholder="Añadir un paso y pulsar Intro"
                  className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-faint"
                />
              </form>
            </section>
          )}

          {/* Resultado: capturas y enlaces */}
          <section className={has.shots ? "border-t border-line px-5 py-5 sm:px-6" : "hidden"}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Resultado</h3>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((s) => (
                  <figure key={s.id} className="group relative m-0 overflow-hidden rounded-2xl border border-line bg-field">
                    <button
                      type="button"
                      onClick={() => setViewing(s)}
                      className="block aspect-[4/3] w-full overflow-hidden bg-col"
                      aria-label={`Ver captura: ${s.label}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shotSrc(s)} alt={s.label} loading="lazy" className="size-full object-cover object-top" />
                    </button>
                    <figcaption className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          Abrir <ExternalLink size={13} />
                        </a>
                      )}
                    </figcaption>
                    <button
                      type="button"
                      onClick={() => removeShot(s)}
                      aria-label="Quitar captura"
                      className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-surface/90 text-muted shadow-sm hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    >
                      <X size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
            {links.length > 0 && (
              <ul className={`flex flex-col gap-2 ${images.length > 0 ? "mt-3" : ""}`}>
                {links.map((s) => (
                  <li key={s.id} className="group flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5">
                    <Link2 size={18} className="shrink-0 text-muted" />
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{s.label}</span>
                        <ExternalLink size={13} className="shrink-0 text-muted" />
                      </p>
                      {s.url && <p className="truncate text-sm text-muted">{host(s.url)}</p>}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeShot(s)}
                      aria-label="Quitar enlace"
                      className="p-1 text-faint hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ShotForm open={shotForm} setOpen={setShotForm} hasShots={shots.length > 0} onAdd={addShot} />
          </section>

          {/* Lo que falta por añadir */}
          {!(has.brief && has.notes && has.steps && has.shots) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
              <span className="mr-1 text-sm text-muted">Añadir:</span>
              {!has.brief && <AddChip onClick={() => open("brief")}>Lo que pidió el cliente</AddChip>}
              {!has.notes && <AddChip onClick={() => open("notes")}>Lo que hay</AddChip>}
              {!has.steps && <AddChip onClick={() => open("steps")}>Pasos</AddChip>}
              {!has.shots && <AddChip onClick={() => setShotForm(true)}>Captura o enlace</AddChip>}
            </div>
          )}

          {/* Pie */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar la tarea «${task.title}»?`)) onDelete();
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} /> Eliminar
            </button>
            {(task.status === "todo" || task.status === "doing") && othersForMe.length > 0 && (
              <button
                type="button"
                onClick={askReview}
                title="Pasa la tarea a Revisar"
                className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.3)] hover:brightness-110"
              >
                Pedir OK a {names(othersForMe)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Captura ampliada */}
      {viewing && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/85" onClick={() => setViewing(null)}>
          <div className="flex min-h-full flex-col items-center justify-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shotSrc(viewing)} alt={viewing.label} className="h-auto max-w-full rounded-xl" />
            <div className="flex flex-wrap items-center justify-center gap-3 text-white" onClick={(e) => e.stopPropagation()}>
              <span className="font-medium">{viewing.label}</span>
              {viewing.url && (
                <a
                  href={viewing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black"
                >
                  Abrir {host(viewing.url)} <ExternalLink size={14} />
                </a>
              )}
              <button type="button" onClick={() => setViewing(null)} className="rounded-full px-3 py-1.5 text-sm text-white/80 hover:text-white">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-sm text-muted transition hover:bg-chip2 hover:text-foreground"
    >
      <Plus size={14} /> {children}
    </button>
  );
}

/** Texto que crece con lo escrito y se guarda al salir del campo. */
function AutoText({
  value,
  placeholder,
  autoFocus,
  onSave,
}: {
  value?: string;
  placeholder: string;
  autoFocus?: boolean;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value ?? "");
  return (
    <textarea
      autoFocus={autoFocus}
      value={text}
      rows={3}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== (value ?? "").trim() && onSave(text)}
      placeholder={placeholder}
      className={`${FIELD} min-h-24 resize-none leading-relaxed [field-sizing:content]`}
    />
  );
}

/**
 * Añadir un resultado: una captura (se elige o se pega con Ctrl+V), un enlace a lo
 * real, o las dos cosas. La imagen se comprime aquí antes de subirla.
 */
function ShotForm({
  open,
  setOpen,
  hasShots,
  onAdd,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  hasShots: boolean;
  onAdd: (form: FormData) => Promise<string | undefined>;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: Blob) {
    setOpen(true);
    setError("");
    try {
      const blob = await compressImage(file);
      setImage(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError("No se pudo leer esa imagen.");
    }
  }

  // la vista previa anterior se libera al cambiarla o al cerrar
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // Pegar una captura en cualquier punto de la ficha la añade aquí.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      void pick(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function reset() {
    setLabel("");
    setUrl("");
    setImage(null);
    setPreview(null);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!image && !url.trim()) return setError("Añade una captura, un enlace o los dos.");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("label", label);
    form.set("url", url);
    if (image) form.set("image", image, image.type === "image/webp" ? "captura.webp" : "captura.jpg");
    const err = await onAdd(form).catch(() => "No se pudo subir. Inténtalo de nuevo.");
    setBusy(false);
    if (err) return setError(err);
    reset();
    setOpen(false);
  }

  if (!open) {
    return hasShots ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <Plus size={15} /> Añadir captura o enlace
      </button>
    ) : null;
  }

  return (
    <form onSubmit={submit} className={`flex flex-col gap-2 ${hasShots ? "mt-4" : ""}`}>
      {preview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Captura elegida" className="max-h-56 rounded-xl border border-line" />
          <button
            type="button"
            onClick={() => {
              setImage(null);
              setPreview(null);
            }}
            aria-label="Quitar la captura elegida"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-surface/90 text-muted shadow-sm hover:text-red-500"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-edge px-4 py-6 text-muted transition hover:border-primary hover:text-foreground"
        >
          <ImagePlus size={22} />
          <span className="font-medium">Elegir captura</span>
          <span className="text-sm">o pégala aquí con Ctrl+V</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nombre (p. ej. Instagram)"
          className={`${FIELD} sm:flex-1`}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enlace a lo real (opcional)"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          className={`${FIELD} sm:flex-[1.4]`}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-hov"
        >
          Cancelar
        </button>
        <button
          disabled={busy}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Subiendo…" : "Añadir"}
        </button>
      </div>
    </form>
  );
}
