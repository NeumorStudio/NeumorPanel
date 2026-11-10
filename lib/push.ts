import "server-only";
import webpush from "web-push";
import { mutateDB, readDB } from "./db";

// Avisos al móvil o al ordenador (Web Push). Hacen falta dos claves VAPID:
//   npx web-push generate-vapid-keys
// y ponerlas en VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY. Sin ellas, el panel
// funciona igual pero no manda avisos.

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
// Contacto para el servicio de avisos (Apple exige un mailto: o una https válida).
const SUBJECT =
  process.env.VAPID_SUBJECT ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://github.com/NeumorStudio/NeumorPanel");

/** Clave pública para que el navegador se suscriba; null si los avisos no están configurados. */
export const pushPublicKey = (): string | null => (PUBLIC_KEY && PRIVATE_KEY ? PUBLIC_KEY : null);

/**
 * Solo se aceptan direcciones de los servicios de avisos de los navegadores
 * (Chrome/Android, Firefox, Safari/iPhone, Edge): así el servidor nunca hace
 * peticiones a otro sitio.
 */
const PUSH_HOST = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;

export function isPushEndpoint(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 1000) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && PUSH_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

export type PushMessage = {
  title: string;
  body: string;
  url: string; // ruta del panel que se abre al tocar el aviso
  tag?: string; // avisos con el mismo tag se sustituyen en vez de amontonarse
};

/**
 * Manda un aviso a todos los dispositivos de una persona. Nunca lanza error:
 * si un dispositivo ya no existe (el navegador lo dio de baja), se borra.
 * Devuelve a cuántos dispositivos llegó.
 */
export async function notifyMember(memberId: string, msg: PushMessage): Promise<number> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return 0;
  try {
    const subs = ((await readDB()).push ?? []).filter((s) => s.memberId === memberId);
    if (!subs.length) return 0;

    const payload = JSON.stringify(msg);
    const gone: string[] = [];
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, {
            vapidDetails: { subject: SUBJECT, publicKey: PUBLIC_KEY, privateKey: PRIVATE_KEY },
            TTL: 60 * 60 * 24, // si el móvil está apagado, el aviso espera hasta un día
            timeout: 8000,
          });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) gone.push(s.id);
          else console.error("[avisos] no se pudo mandar el aviso:", code ?? e);
        }
      }),
    );

    if (gone.length) {
      await mutateDB((db) => {
        db.push = (db.push ?? []).filter((s) => !gone.includes(s.id));
      });
    }
    return sent;
  } catch (e) {
    console.error("[avisos] error al mandar avisos:", e);
    return 0;
  }
}
