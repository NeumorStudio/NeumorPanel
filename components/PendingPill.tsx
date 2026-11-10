"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import Avatar from "./Avatar";
import type { Member, TaskStatus } from "@/lib/types";

export type PendingTask = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: Member;
};

/**
 * Píldora "N pendientes" de las tarjetas de la home. Al pulsarla abre una lista
 * con el título de cada tarea y la foto de su responsable, sin entrar al proyecto.
 */
export default function PendingPill({
  tasks,
  accent,
  href,
}: {
  tasks: PendingTask[];
  accent: string;
  href: string;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;
  const n = tasks.length;

  // La lista flotante cuelga de <body>, así no la recorta la tarjeta. Se cierra
  // al hacer scroll, redimensionar o pulsar Escape.
  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    // desplazar la lista del propio menú no debe cerrarlo
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Revisar primero, luego en curso y por hacer; dentro de cada grupo se respeta el orden.
  const rank = (s: TaskStatus) => (s === "review" ? 2 : s === "doing" ? 1 : 0);
  const sorted = [...tasks].sort((a, b) => rank(b.status) - rank(a.status));

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          // la tarjeta entera es un enlace: aquí solo queremos abrir la lista
          e.preventDefault();
          e.stopPropagation();
          if (open) return setPos(null);
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) });
        }}
        className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-surface active:scale-95"
      >
        <span className="size-2 rounded-full" style={{ background: accent }} />
        <span className="tabular-nums">{n}</span>
        <span className="font-medium text-muted">{n === 1 ? "pendiente" : "pendientes"}</span>
      </button>

      {pos &&
        createPortal(
          <div
            // los eventos de React suben por el portal hasta la tarjeta (un <Link>): se cortan aquí
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fixed inset-0 z-50" onClick={() => setPos(null)} />
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-surface shadow-[0_16px_48px_rgba(20,24,50,0.22)]"
              style={{ top: pos.top, right: pos.right }}
            >
              <ul className="max-h-72 overflow-y-auto p-1.5">
                {sorted.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
                    <span
                      className="size-3 shrink-0 rounded-full border-2"
                      title={t.status === "review" ? "Revisar" : t.status === "doing" ? "En curso" : "Por hacer"}
                      style={
                        t.status === "review"
                          ? { background: "#f59e0b", borderColor: "#f59e0b" }
                          : t.status === "doing"
                            ? { background: "#2f6bff", borderColor: "#2f6bff" }
                            : { borderColor: "var(--edge)" }
                      }
                    />
                    <span className="min-w-0 flex-1 break-words text-sm leading-snug">{t.title}</span>
                    {t.assignee ? (
                      <Avatar member={t.assignee} size={26} />
                    ) : (
                      <span
                        title="Sin asignar"
                        className="grid size-[26px] shrink-0 place-items-center rounded-full border border-dashed border-edge text-faint"
                      >
                        <UserPlus size={12} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm font-medium text-primary hover:bg-hov"
              >
                Abrir proyecto <ArrowRight size={15} />
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
