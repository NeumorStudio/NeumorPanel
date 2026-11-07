"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export type MenuOption = {
  value: string | null;
  label: string;
  icon?: React.ReactNode;
};

/** Botón que abre un pequeño desplegable de opciones (responsable, parte…). */
export default function OptionMenu({
  trigger,
  options,
  selected,
  onSelect,
  align = "left",
  title,
}: {
  trigger: React.ReactNode;
  options: MenuOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  align?: "left" | "right";
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        className="block rounded-full transition-transform hover:scale-105"
      >
        {trigger}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`absolute top-full z-40 mt-1.5 min-w-48 rounded-2xl bg-surface p-1.5 shadow-card-hover ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {options.map((o) => (
              <button
                type="button"
                role="menuitem"
                key={o.value ?? "none"}
                onClick={() => {
                  setOpen(false);
                  if (o.value !== selected) onSelect(o.value);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-hov"
              >
                <span className="grid size-7 shrink-0 place-items-center">{o.icon}</span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === selected && <Check size={16} className="shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
