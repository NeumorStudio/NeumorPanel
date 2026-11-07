import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from "crypto";
import { cookies } from "next/headers";

// Las credenciales se cifran con una clave derivada de la contraseña maestra (scrypt).
// La contraseña maestra nunca se guarda. Tras desbloquear, la clave viaja en una cookie
// httpOnly cifrada con AUTH_SECRET y con caducidad.

export const COOKIE = "np_vault";
export const UNLOCK_MINUTES = 30;

export type Secret = { service: string; username: string; password: string; url: string; notes: string; icon?: string };

export function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? reject(e) : resolve(k))),
  );
}

export function encrypt(key: Buffer, data: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function decrypt<T>(key: Buffer, blob: string): T | null {
  try {
    const raw = Buffer.from(blob, "base64");
    const d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

function cookieKey() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET");
  return createHash("sha256").update(`vault-cookie:${secret}`).digest();
}

export async function grantUnlock(key: Buffer, login: string) {
  const exp = Date.now() + UNLOCK_MINUTES * 60_000;
  const jar = await cookies();
  jar.set(COOKIE, encrypt(cookieKey(), { k: key.toString("base64"), login, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_MINUTES * 60,
  });
}

export async function revokeUnlock() {
  (await cookies()).delete(COOKIE);
}

/** Clave de cifrado si la sección está desbloqueada para este usuario; si no, null. */
export async function unlockedKey(login: string): Promise<Buffer | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const p = decrypt<{ k: string; login: string; exp: number }>(cookieKey(), v);
  if (!p || p.login !== login || p.exp < Date.now()) return null;
  return Buffer.from(p.k, "base64");
}
