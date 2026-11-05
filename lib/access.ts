import "server-only";
import { mutateDB, readDB } from "./db";
import type { Member } from "./types";

/** Usuarios que pueden entrar siempre (primer acceso). Variable ALLOWED_GITHUB_USERS. */
function seeds(): string[] {
  return (process.env.ALLOWED_GITHUB_USERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * Se llama al iniciar sesión con GitHub. Deja entrar solo a quien está
 * invitado (miembro con ese usuario) o en ALLOWED_GITHUB_USERS, y
 * actualiza su nombre y foto.
 */
export async function registerLogin(
  login: string,
  name: string | null | undefined,
  avatar: string | null | undefined,
): Promise<boolean> {
  const allowedBySeed = seeds().includes(login.toLowerCase());
  return mutateDB((db) => {
    let m = db.members.find((x) => same(x.github, login));
    if (!m) {
      if (!allowedBySeed) return false;
      // Reutiliza un hueco de los "Persona 1/2" iniciales si queda alguno
      m = db.members.find((x) => !x.github && (x.id === "m1" || x.id === "m2"));
      if (m) {
        m.name = name || login;
      } else {
        m = { id: crypto.randomUUID(), name: name || login, theme: "purple" };
        db.members.push(m);
      }
    }
    m.github = login;
    if (avatar) m.avatar = avatar;
    return true;
  });
}

/** ¿Sigue teniendo acceso este usuario? (por si lo han quitado del equipo) */
export async function isAllowed(login: string): Promise<Member | null> {
  const db = await readDB();
  return db.members.find((x) => same(x.github, login)) ?? null;
}
