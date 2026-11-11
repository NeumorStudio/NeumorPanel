"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { Check, LogOut, Trash2, UserPlus } from "lucide-react";
import { THEME_LIST } from "@/lib/themes";
import type { Member } from "@/lib/types";
import { inviteMember, removeMember, saveMembers } from "@/app/actions";
import Avatar from "./Avatar";
import { stopPushHere } from "@/lib/push-client";

export default function MembersForm({ initial, meId }: { initial: Member[]; meId: string }) {
  const [members, setMembers] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // Cuando el servidor revalida (al invitar o quitar), `initial` cambia.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setMembers(initial);
  }

  const update = (id: string, patch: Partial<Member>) => {
    setSaved(false);
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setError("");
    start(async () => {
      const res = await inviteMember(username);
      if (res.error) setError(res.error);
      else setUsername("");
    });
  }

  function remove(m: Member) {
    if (!confirm(`¿Quitar a ${m.name} del equipo? Dejará de poder entrar.`)) return;
    start(async () => {
      const res = await removeMember(m.id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <section className="rounded-3xl bg-surface p-6 shadow-card">
        <h2 className="text-xl font-semibold">Equipo</h2>
        <p className="mb-5 text-muted">Quién puede entrar, con su nombre y color.</p>

        <div className="flex flex-col gap-5">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <Avatar member={m} size={44} />
              <div className="min-w-0 flex-1 basis-40">
                <input
                  value={m.name}
                  onChange={(e) => update(m.id, { name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-field px-3.5 py-2.5 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-[15px]"
                />
                <p className="mt-1 truncate pl-1 text-xs text-muted">
                  {m.github ? `@${m.github}` : "Sin cuenta de GitHub"}
                  {m.id === meId && " · tú"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {THEME_LIST.map((t) => (
                  <button
                    key={t.id}
                    title={t.label}
                    onClick={() => update(m.id, { theme: t.id })}
                    className="grid size-6 place-items-center rounded-full"
                    style={{ background: t.accent }}
                  >
                    {m.theme === t.id && <Check size={13} className="text-white" strokeWidth={3} />}
                  </button>
                ))}
                {m.id !== meId && (
                  <button
                    onClick={() => remove(m)}
                    className="ml-1 p-1 text-faint hover:text-red-500"
                    aria-label={`Quitar a ${m.name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveMembers(members.map(({ id, name, theme }) => ({ id, name, theme })));
              setSaved(true);
            })
          }
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.3)] hover:brightness-110 disabled:opacity-60"
        >
          {saved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </section>

      <section className="rounded-3xl bg-surface p-6 shadow-card">
        <h2 className="text-xl font-semibold">Invitar con GitHub</h2>
        <p className="mb-4 text-muted">
          Escribe su usuario de GitHub. Podrá entrar con su cuenta y se añadirá con su foto.
        </p>
        <form onSubmit={invite} className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="usuario-de-github"
            autoCapitalize="none"
            autoCorrect="off"
            className="min-w-0 flex-1 rounded-xl border border-line bg-field px-3.5 py-2.5 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-[15px]"
          />
          <button
            disabled={pending || !username.trim()}
            className="flex items-center gap-2 rounded-xl bg-ink px-4 font-medium text-onink hover:opacity-90 disabled:opacity-50"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">Invitar</span>
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <button
        onClick={async () => {
          // al salir, este dispositivo deja de recibir tus avisos
          await stopPushHere().catch(() => undefined);
          await signOut({ redirectTo: "/login" });
        }}
        className="flex w-fit items-center gap-2 px-1 text-muted hover:text-foreground"
      >
        <LogOut size={18} /> Cerrar sesión
      </button>
    </div>
  );
}
