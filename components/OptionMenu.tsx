"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export type MenuOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

type BaseProps = {
  trigger: React.ReactNode;
  options: MenuOption[];
  align?: "left" | "right";
  title?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  selected: string | null;
  onSelect: (value: string | null) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  selected: string[];
  onToggle: (value: string) => void;
  /** Fila para dejar la selección vacía (sin parte, sin asignar…). */
  clear?: { label: string; icon?: React.ReactNode };
  onClear?: () => void;
};

/**
 * Botón que abre un pequeño desplegable de opciones (responsables, partes…).
 * Con `multiple` cada opción se marca o desmarca sin cerrar el menú.
 */
export default function OptionMenu(props: SingleProps | MultiProps) {
  const { trigger, options, align = "left", title } = props;
  const [open, setOpen] = useState(false);
  const marked: string[] = props.multiple ? props.selected : props.selected ? [props.selected] : [];

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
                key={o.value}
                aria-checked={marked.includes(o.value)}
                onClick={() => {
                  if (props.multiple) {
                    props.onToggle(o.value);
                    return;
                  }
                  setOpen(false);
                  if (o.value !== props.selected) props.onSelect(o.value);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-hov"
              >
                <span className="grid size-7 shrink-0 place-items-center">{o.icon}</span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {marked.includes(o.value) && <Check size={16} className="shrink-0 text-primary" />}
              </button>
            ))}
            {props.multiple && props.clear && marked.length > 0 && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  props.onClear?.();
                }}
                className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-line px-2.5 py-2 text-left text-sm text-muted hover:bg-hov"
              >
                <span className="grid size-7 shrink-0 place-items-center">{props.clear.icon}</span>
                <span className="min-w-0 flex-1 truncate">{props.clear.label}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
