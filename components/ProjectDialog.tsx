"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { THEME_LIST } from "@/lib/themes";
import type { Project, ThemeId } from "@/lib/types";
import { createProject, updateProject } from "@/app/actions";

const INPUT =
  "w-full rounded-xl border border-line bg-[#fafbfd] px-3.5 py-2.5 text-base sm:text-[15px] outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10";

export default function ProjectDialog({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [category, setCategory] = useState(project?.category ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [dueDate, setDueDate] = useState(project?.dueDate ?? "");
  const [theme, setTheme] = useState<ThemeId>(project?.theme ?? "blue");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    start(async () => {
      const input = { name, category, description, theme, dueDate };
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

        <div className="flex gap-2.5">
          {THEME_LIST.map((t) => (
            <button
              type="button"
              key={t.id}
              title={t.label}
              onClick={() => setTheme(t.id)}
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
