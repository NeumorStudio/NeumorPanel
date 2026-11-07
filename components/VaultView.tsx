"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Dices, Upload, Eye, EyeOff, ExternalLink, KeyRound, Lock, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { rowsFromCSV, type ImportRow } from "@/lib/csv";
import { deleteCredential, importCredentials, lockVault, saveCredential } from "@/app/vault-actions";

export type Credential = {
  id: string;
  projectId?: string;
  service: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};
type Proj = { id: string; name: string };

const INPUT =
  "w-full rounded-xl border border-line bg-field px-3.5 py-2.5 text-base outline-none focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10 sm:text-[15px]";

function generate() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*-_";
  const buf = crypto.getRandomValues(new Uint32Array(20));
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-hov"
    >
      {done ? <Check size={16} className="text-[#34c26b]" /> : <Copy size={16} />}
    </button>
  );
}

function Card({ c, project, onEdit }: { c: Credential; project?: Proj; onEdit: () => void }) {
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accsoft text-accink">
          <KeyRound size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.service}</p>
          {project && <p className="truncate text-xs text-muted">{project.name}</p>}
        </div>
        {c.url && (
          <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir" className="grid size-8 place-items-center rounded-full text-muted hover:bg-hov">
            <ExternalLink size={16} />
          </a>
        )}
        <button onClick={onEdit} aria-label="Editar" className="grid size-8 place-items-center rounded-full text-muted hover:bg-hov">
          <Pencil size={16} />
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar la credencial «${c.service}»?`)) start(async () => void (await deleteCredential(c.id)));
          }}
          aria-label="Eliminar"
          className="grid size-8 place-items-center rounded-full text-faint hover:text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {c.username && (
        <div className="flex items-center gap-1 rounded-xl bg-col px-3 py-1">
          <span className="min-w-0 flex-1 truncate text-sm">{c.username}</span>
          <CopyButton text={c.username} label="Copiar usuario" />
        </div>
      )}
      {c.password && (
        <div className="flex items-center gap-1 rounded-xl bg-col px-3 py-1">
          <span className="min-w-0 flex-1 truncate font-mono text-sm">{show ? c.password : "••••••••••••"}</span>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar" : "Mostrar"}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-hov"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <CopyButton text={c.password} label="Copiar contraseña" />
        </div>
      )}
      {c.notes && <p className="whitespace-pre-wrap px-1 text-sm text-muted">{c.notes}</p>}
    </div>
  );
}

function CredentialDialog({
  initial,
  projects,
  onClose,
}: {
  initial?: Credential;
  projects: Proj[];
  onClose: () => void;
}) {
  const [f, setF] = useState({
    service: initial?.service ?? "",
    username: initial?.username ?? "",
    password: initial?.password ?? "",
    url: initial?.url ?? "",
    notes: initial?.notes ?? "",
    projectId: initial?.projectId ?? "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveCredential(initial?.id ?? null, { ...f, projectId: f.projectId || undefined });
      if (r.error) setError(r.error);
      else onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={submit} className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{initial ? "Editar credencial" : "Nueva credencial"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full text-muted hover:bg-soft">
            <X size={18} />
          </button>
        </div>
        <input autoFocus className={INPUT} placeholder="Servicio (p. ej. Vercel, IONOS…)" value={f.service} onChange={set("service")} />
        <input className={INPUT} placeholder="Usuario o email" autoComplete="off" value={f.username} onChange={set("username")} />
        <div className="flex gap-2">
          <input
            className={`${INPUT} font-mono`}
            type={showPw ? "text" : "password"}
            placeholder="Contraseña"
            autoComplete="new-password"
            value={f.password}
            onChange={set("password")}
          />
          <button type="button" onClick={() => setShowPw((s) => !s)} aria-label="Mostrar" className="grid w-11 shrink-0 place-items-center rounded-xl bg-soft text-muted hover:bg-soft2">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setF({ ...f, password: generate() });
              setShowPw(true);
            }}
            aria-label="Generar contraseña"
            title="Generar contraseña"
            className="grid w-11 shrink-0 place-items-center rounded-xl bg-soft text-muted hover:bg-soft2"
          >
            <Dices size={18} />
          </button>
        </div>
        <input className={INPUT} placeholder="URL (opcional)" value={f.url} onChange={set("url")} />
        <select className={INPUT} value={f.projectId} onChange={set("projectId")}>
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <textarea className={`${INPUT} resize-none`} rows={3} placeholder="Notas (opcional)" value={f.notes} onChange={set("notes")} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          disabled={pending || !f.service.trim()}
          className="mt-1 rounded-xl bg-primary py-3 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.35)] hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}

function ImportDialog({ projects, onClose }: { projects: Proj[]; onClose: () => void }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [pending, start] = useTransition();

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setRows(null);
    setFileName(file.name);
    const parsed = rowsFromCSV(await file.text());
    if (!parsed || parsed.length === 0) setError("No reconozco este archivo. Tiene que ser un CSV exportado (nombre, url, usuario, contraseña).");
    else setRows(parsed);
  }

  function run() {
    if (!rows) return;
    start(async () => {
      const r = await importCredentials(rows, projectId || undefined);
      if (r.error) setError(r.error);
      else setResult({ added: r.added ?? 0, skipped: r.skipped ?? 0 });
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Importar contraseñas</h2>
          <button onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full text-muted hover:bg-soft">
            <X size={18} />
          </button>
        </div>
        {result ? (
          <>
            <p className="rounded-2xl bg-accsoft p-4 text-accink">
              Importadas <b>{result.added}</b>
              {result.skipped > 0 && <> · {result.skipped} ya existían</>}.
            </p>
            <p className="text-sm text-muted">Borra ahora el CSV de tu equipo: contiene las contraseñas sin cifrar.</p>
            <button onClick={onClose} className="rounded-xl bg-primary py-3 font-medium text-white hover:brightness-110">
              Listo
            </button>
          </>
        ) : (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>
                En Google: <b>passwords.google.com</b> → Ajustes → <b>Exportar contraseñas</b> (con el perfil de Neumor).
              </li>
              <li>Sube aquí el archivo CSV descargado.</li>
            </ol>
            <input type="file" accept=".csv,text/csv" onChange={pick} className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-soft file:px-4 file:py-2 file:text-sm file:text-foreground hover:file:bg-soft2" />
            {rows && (
              <>
                <p className="text-sm">
                  <b>{rows.length}</b> credenciales en «{fileName}».
                </p>
                <select className={INPUT} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              disabled={!rows || pending}
              onClick={run}
              className="rounded-xl bg-primary py-3 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.35)] hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
            >
              {pending ? "Importando…" : "Importar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VaultView({ items, projects }: { items: Credential[]; projects: Proj[] }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Credential | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [, start] = useTransition();
  const term = q.trim().toLowerCase();
  const shown = items.filter((c) => {
    if (!term) return true;
    const p = projects.find((x) => x.id === c.projectId)?.name ?? "";
    return [c.service, c.username, c.url, p].some((v) => v.toLowerCase().includes(term));
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-56">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className={`${INPUT} pl-10`} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button
          onClick={() => setImporting(true)}
          className="flex items-center gap-2 rounded-xl bg-soft px-4 py-2.5 text-sm text-muted hover:bg-soft2"
        >
          <Upload size={16} /> Importar
        </button>
        <button
          onClick={() => start(() => lockVault())}
          className="flex items-center gap-2 rounded-xl bg-soft px-4 py-2.5 text-sm text-muted hover:bg-soft2"
        >
          <Lock size={16} /> Bloquear
        </button>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 font-medium text-white shadow-[0_8px_20px_rgba(47,107,255,0.35)] hover:brightness-110"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Nueva</span>
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-edge bg-surface/60 py-20 text-center">
          <p className="font-semibold">{items.length ? "Nada coincide" : "Aún no hay credenciales"}</p>
          {!items.length && <p className="mt-1 text-muted">Guarda aquí los accesos: hosting, dominios, paneles…</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <Card key={c.id} c={c} project={projects.find((p) => p.id === c.projectId)} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-muted">Se bloquea sola a los 30 minutos.</p>

      {importing && <ImportDialog projects={projects} onClose={() => setImporting(false)} />}
      {editing && (
        <CredentialDialog
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          projects={projects}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
