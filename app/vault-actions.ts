"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { mutateDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { decrypt, deriveKey, encrypt, grantUnlock, revokeUnlock, unlockedKey, type Secret } from "@/lib/vault";

type Result = { error?: string };
const PATH = "/credenciales";
const MAX_FAILS = 5;
const LOCK_MS = 60_000;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Primera vez: crea la contraseña maestra del equipo. */
export async function setupVault(password: string): Promise<Result> {
  const me = await requireUser();
  if (typeof password !== "string" || password.length < 8) return { error: "Mínimo 8 caracteres." };
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  const created = await mutateDB((db) => {
    if (db.vault) return false;
    db.vault = { salt: salt.toString("base64"), check: encrypt(key, { ok: true }), items: [] };
    return true;
  });
  if (!created) return { error: "Ya hay una contraseña creada." };
  await grantUnlock(key, me.id);
  revalidatePath(PATH);
  return {};
}

export async function unlockVault(password: string): Promise<Result> {
  const me = await requireUser();
  const state = await mutateDB((db) => {
    const v = db.vault;
    if (!v) return null;
    if ((v.lockUntil ?? 0) > Date.now()) return { wait: Math.ceil((v.lockUntil! - Date.now()) / 1000) };
    return { salt: v.salt, check: v.check };
  });
  if (!state) return { error: "Aún no hay contraseña creada." };
  if ("wait" in state) return { error: `Demasiados intentos. Espera ${state.wait} s.` };

  const key = await deriveKey(typeof password === "string" ? password : "", Buffer.from(state.salt, "base64"));
  const ok = decrypt<{ ok: boolean }>(key, state.check)?.ok === true;
  await mutateDB((db) => {
    if (!db.vault) return;
    if (ok) {
      db.vault.fails = 0;
      db.vault.lockUntil = undefined;
    } else {
      db.vault.fails = (db.vault.fails ?? 0) + 1;
      if (db.vault.fails >= MAX_FAILS) {
        db.vault.fails = 0;
        db.vault.lockUntil = Date.now() + LOCK_MS;
      }
    }
  });
  if (!ok) return { error: "Contraseña incorrecta." };
  await grantUnlock(key, me.id);
  revalidatePath(PATH);
  return {};
}

export async function lockVault() {
  await requireUser();
  await revokeUnlock();
  revalidatePath(PATH);
}

export async function saveCredential(
  id: string | null,
  input: { service: string; username: string; password: string; url: string; notes: string; projectId?: string },
): Promise<Result> {
  const me = await requireUser();
  const key = await unlockedKey(me.id);
  if (!key) return { error: "Sesión bloqueada. Vuelve a introducir la contraseña." };
  const secret: Secret = {
    service: str(input.service, 80),
    username: str(input.username, 200),
    password: typeof input.password === "string" ? input.password.slice(0, 500) : "",
    url: str(input.url, 300),
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 2000) : "",
  };
  if (!secret.service) return { error: "Pon el nombre del servicio." };
  const blob = encrypt(key, secret);
  const ok = await mutateDB((db) => {
    const v = db.vault;
    if (!v) return false;
    const projectId = db.projects.some((p) => p.id === input.projectId) ? input.projectId : undefined;
    const existing = id ? v.items.find((i) => i.id === id) : undefined;
    if (existing) {
      existing.blob = blob;
      existing.projectId = projectId;
    } else {
      v.items.unshift({ id: crypto.randomUUID(), projectId, blob, by: me.id, at: new Date().toISOString() });
    }
    return true;
  });
  if (!ok) return { error: "No hay contraseña creada." };
  revalidatePath(PATH);
  return {};
}

export async function deleteCredential(id: string): Promise<Result> {
  const me = await requireUser();
  if (!(await unlockedKey(me.id))) return { error: "Sesión bloqueada." };
  await mutateDB((db) => {
    if (db.vault) db.vault.items = db.vault.items.filter((i) => i.id !== id);
  });
  revalidatePath(PATH);
  return {};
}

/** Importa en bloque (p. ej. el CSV de Google). Se saltan las que ya existen. */
export async function importCredentials(
  rows: { service: string; username: string; password: string; url: string; notes: string }[],
  projectId?: string,
): Promise<Result & { added?: number; skipped?: number }> {
  const me = await requireUser();
  const key = await unlockedKey(me.id);
  if (!key) return { error: "Sesión bloqueada. Vuelve a introducir la contraseña." };
  if (!Array.isArray(rows) || rows.length === 0) return { error: "No hay nada que importar." };
  if (rows.length > 3000) return { error: "Demasiadas filas (máximo 3000)." };

  const clean: Secret[] = rows.flatMap((r) => {
    const s: Secret = {
      service: str(r?.service, 80),
      username: str(r?.username, 200),
      password: typeof r?.password === "string" ? r.password.slice(0, 500) : "",
      url: str(r?.url, 300),
      notes: typeof r?.notes === "string" ? r.notes.trim().slice(0, 2000) : "",
    };
    return s.service ? [s] : [];
  });

  const res = await mutateDB((db) => {
    const v = db.vault;
    if (!v) return null;
    const pid = db.projects.some((p) => p.id === projectId) ? projectId : undefined;
    const sig = (s: Secret) => `${s.service}\n${s.username}\n${s.url}`.toLowerCase();
    const seen = new Set<string>();
    for (const i of v.items) {
      const s = decrypt<Secret>(key, i.blob);
      if (s) seen.add(sig(s));
    }
    let added = 0;
    const at = new Date().toISOString();
    for (const s of clean) {
      if (seen.has(sig(s))) continue;
      seen.add(sig(s));
      v.items.push({ id: crypto.randomUUID(), projectId: pid, blob: encrypt(key, s), by: me.id, at });
      added++;
    }
    return { added, skipped: clean.length - added };
  });
  if (!res) return { error: "No hay contraseña creada." };
  revalidatePath(PATH);
  return res;
}
