"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { setupVault, unlockVault } from "@/app/vault-actions";

const INPUT =
  "w-full rounded-xl border border-line bg-field px-3.5 py-2.5 text-base outline-none focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10 sm:text-[15px]";

export default function VaultGate({ mode }: { mode: "setup" | "unlock" }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const setup = mode === "setup";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (setup && pw !== pw2) return setError("Las contraseñas no coinciden.");
    start(async () => {
      const r = await (setup ? setupVault(pw) : unlockVault(pw));
      if (r.error) setError(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-sm flex-col gap-3 rounded-3xl bg-surface p-8 shadow-card">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accsoft text-accink">
        <Lock size={26} />
      </span>
      <h2 className="text-center text-xl font-semibold">
        {setup ? "Crea la contraseña del equipo" : "Introduce la contraseña"}
      </h2>
      {setup && (
        <p className="text-center text-sm text-muted">
          Cifra todas las credenciales. No se guarda en ningún sitio: si se pierde, no se puede recuperar.
        </p>
      )}
      <input
        autoFocus
        type="password"
        autoComplete={setup ? "new-password" : "current-password"}
        className={INPUT}
        placeholder="Contraseña"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      {setup && (
        <input
          type="password"
          autoComplete="new-password"
          className={INPUT}
          placeholder="Repite la contraseña (mín. 8)"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        disabled={pending || !pw}
        className="rounded-xl bg-primary py-3 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.35)] hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
      >
        {setup ? "Crear y entrar" : "Desbloquear"}
      </button>
    </form>
  );
}
