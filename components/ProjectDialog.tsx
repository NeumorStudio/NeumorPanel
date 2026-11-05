"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { THEME_LIST, THEMES, getTheme, isHex } from "@/lib/themes";
import ColorWheel from "./ColorWheel";
import { participantsOf } from "@/lib/participants";
import Avatar from "./Avatar";
import { MAX_AREAS, MAX_AREA_LENGTH, areaColor, normalizeAreas } from "@/lib/areas";
import type { Member, Project } from "@/lib/types";
import { createProject, updateProject } from "@/app/actions";

const INPUT =
  "w-full rounded-xl border border-line bg-[#fafbfd] px-3.5 py-2.5 text-base sm:text-[15px] outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10";

export default function ProjectDialog({
  project,
  members,
  onClose,
}: {
  project?: Project;
  members: Member[];
  onClose: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [category, setCategory] = useState(project?.category ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [dueDate, setDueDate] = useState(project?.dueDate ?? "");
  const [theme, setTheme] = useState<string>(project?.theme ?? "blue");
  const [wheelOpen, setWheelOpen] = useState(false);
  const [areas, setAreas] = useState<string[]>(project?.areas ?? []);
  const [areaDraft, setAreaDraft] = useState("");
  const [people, setPeople] = useState<string[]>(
    () => participantsOf(project ?? {}, members).map((m) => m.id),
  );
  const [pending, start] = useTransition();

  function addArea() {
    const next = normalizeAreas([...areas, areaDraft]);
    setAreas(next);
    setAreaDraft("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    start(async () => {
      const input = { name, category, description, theme, dueDate, areas: normalizeAreas([...areas, areaDraft]), members: people };
      if (project) {
        await updateProject(project.id, input);
        onClose();
      } else {
        await createProject(input); // redirige al proyecto nuevo
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {project ? "Editar proyecto" : "Nuevo proyecto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#f1f2f7]"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <input
          autoFocus
          className={INPUT}
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={INPUT}
          placeholder="Tipo (p. ej. Diseño web, Marketing…)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <textarea
          className={`${INPUT} resize-none`}
          rows={2}
          placeholder="Descripción breve (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="flex items-center gap-3 text-sm text-muted">
          Fecha de entrega
          <input
            type="date"
            className={`${INPUT} flex-1`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>

        <div>
          <p className="mb-2 text-sm text-muted">Participantes</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = people.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPeople(on ? people.filter((x) => x !== m.id) : [...people, m.id])}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition ${
                    on ? "bg-[#e6ecff] font-medium text-[#2f4fb8] ring-1 ring-primary/40" : "bg-[#f1f2f7] text-muted"
                  }`}
                >
                  <span className={on ? "" : "opacity-50 grayscale"}>
                    <Avatar member={m} size={26} />
                  </span>
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">
            Partes del proyecto <span className="text-xs">(opcional, para etiquetar tareas)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-sm font-medium text-white"
                style={{ background: areaColor(areas, a) }}
              >
                {a}
                <button
                  type="button"
                  onClick={() => setAreas(areas.filter((x) => x !== a))}
                  className="grid size-5 place-items-center rounded-full bg-white/25 hover:bg-white/40"
                  aria-label={`Quitar ${a}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {areas.length < MAX_AREAS && (
              <input
                value={areaDraft}
                maxLength={MAX_AREA_LENGTH}
                onChange={(e) => setAreaDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addArea();
                  }
                }}
                onBlur={() => areaDraft.trim() && addArea()}
                placeholder={areas.length ? "Otra parte…" : "Ej. Web, App cliente, App admin ⏎"}
                className="min-w-0 flex-1 basis-40 rounded-full border border-dashed border-[#cfd2e0] bg-transparent px-3 py-1 text-base outline-none focus:border-primary sm:text-sm"
              />
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            {THEME_LIST.map((t) => (
              <button
                type="button"
                key={t.id}
                title={t.label}
                onClick={() => {
                  setTheme(t.id);
                  setWheelOpen(false);
                }}
                className="relative size-9 rounded-full ring-offset-2 transition-transform hover:scale-110"
                style={{
                  background: t.bg,
                  boxShadow: theme === t.id ? `0 0 0 2px #fff, 0 0 0 4px ${t.accent}` : undefined,
                }}
              >
                {theme === t.id && (
                  <Check size={16} className="absolute inset-0 m-auto text-white" strokeWidth={3} />
                )}
              </button>
            ))}
            <button
              type="button"
              title="Color personalizado"
              aria-label="Color personalizado"
              aria-expanded={wheelOpen}
              onClick={() => {
                // al abrir por primera vez, parte del color que ya estaba elegido
                if (!wheelOpen && !isHex(theme)) setTheme(getTheme(theme).accent);
                setWheelOpen((o) => !o);
              }}
              className="relative grid size-9 place-items-center rounded-full border-2 border-dashed border-[#c4c7d6] text-muted transition-transform hover:scale-110"
              style={
                isHex(theme)
                  ? {
                      background: getTheme(theme).bg,
                      border: "none",
                      boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${getTheme(theme).accent}`,
                    }
                  : undefined
              }
            >
              {isHex(theme) ? (
                <Check size={16} className="text-white" strokeWidth={3} />
              ) : (
                <Plus size={16} />
              )}
            </button>
          </div>
          {wheelOpen && (
            <div className="mt-3 rounded-2xl bg-[#f6f7fb] p-4">
              <ColorWheel value={isHex(theme) ? theme : THEMES.blue.accent} onChange={setTheme} />
            </div>
          )}
        </div>

        <button
          disabled={pending || !name.trim()}
          className="mt-2 rounded-xl bg-primary py-3 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.35)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
        >
          {project ? "Guardar" : "Crear proyecto"}
        </button>
      </form>
    </div>
  );
}
