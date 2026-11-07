"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Link2, Plus, X } from "lucide-react";
import Avatar from "./Avatar";
import RelativeTime from "./RelativeTime";
import { addLink, deleteLink } from "@/app/actions";
import { getTheme } from "@/lib/themes";
import type { Member, Project } from "@/lib/types";

const INPUT =
  "rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-[15px]";

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function FilesTab({ project, members }: { project: Project; members: Member[] }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const links = [...(project.links ?? [])].reverse(); // los más recientes primero
  const accent = getTheme(project.theme).accent;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    start(async () => {
      const res = await addLink(project.id, title, url);
      if (res.error) setError(res.error);
      else {
        setTitle("");
        setUrl("");
      }
    });
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega un enlace (Figma, Drive, repo…)"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          className={`${INPUT} min-w-0 flex-[2]`}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre (opcional)"
          className={`${INPUT} min-w-0 flex-1`}
        />
        <button
          disabled={pending || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.3)] hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
        >
          <Plus size={18} /> Añadir
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {links.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-edge bg-surface/60 py-14 text-center">
          <p className="font-semibold">Aún no hay enlaces</p>
          <p className="mt-1 text-muted">Guarda aquí lo que necesita el proyecto: diseños, documentos, repos…</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {links.map((l) => {
            const by = members.find((m) => m.id === l.by);
            return (
              <div key={l.id} className="group flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-sm">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: accent }}
                >
                  <Link2 size={20} />
                </span>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    <span className="truncate">{l.title}</span>
                    <ExternalLink size={13} className="shrink-0 text-muted" />
                  </p>
                  <p className="truncate text-sm text-muted">{host(l.url)}</p>
                </a>
                <div className="flex shrink-0 items-center gap-2">
                  {by && <Avatar member={by} size={24} />}
                  <span className="hidden text-xs text-muted sm:inline">
                    <RelativeTime iso={l.at} />
                  </span>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el enlace «${l.title}»?`)) start(() => deleteLink(project.id, l.id));
                    }}
                    className="p-1 text-faint hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    aria-label="Eliminar enlace"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
