"use server";

import { mutateDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isPushEndpoint, notifyMember, pushPublicKey } from "@/lib/push";

// Avisos: cada persona apunta aquí los dispositivos en los que quiere recibirlos.

const KEY = /^[A-Za-z0-9_-]{16,128}={0,2}$/; // base64url
const MAX_DEVICES = 10; // por persona

type SubInput = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/** Guarda (o reasigna) el dispositivo actual para avisar a quien tiene la sesión abierta. */
export async function savePushSubscription(sub: SubInput): Promise<{ error?: string }> {
  const me = await requireUser();
  if (!pushPublicKey()) return { error: "Los avisos aún no están configurados en el servidor." };
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!isPushEndpoint(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    return { error: "Este navegador ha dado una suscripción no válida." };
  }
  if (!KEY.test(p256dh) || !KEY.test(auth)) return { error: "Este navegador ha dado una suscripción no válida." };

  await mutateDB((db) => {
    // Un dispositivo avisa a una sola persona: si otra lo tenía, pasa a quien entra ahora.
    const others = (db.push ?? []).filter((s) => s.endpoint !== endpoint);
    const mine = others.filter((s) => s.memberId === me.id);
    const rest = others.filter((s) => s.memberId !== me.id);
    db.push = [
      ...rest,
      // si alguien acumula demasiados (móviles viejos), se quedan los más recientes
      ...mine.slice(-(MAX_DEVICES - 1)),
      { id: crypto.randomUUID(), memberId: me.id, endpoint, keys: { p256dh, auth }, at: new Date().toISOString() },
    ];
  });
  return {};
}

/** Deja de avisar en este dispositivo. */
export async function deletePushSubscription(endpoint: string) {
  const me = await requireUser();
  await mutateDB((db) => {
    if (!db.push) return;
    db.push = db.push.filter((s) => !(s.endpoint === endpoint && s.memberId === me.id));
  });
}

/** Aviso de prueba a uno mismo, para comprobar que llega. */
export async function sendTestPush(): Promise<{ error?: string }> {
  const me = await requireUser();
  if (!pushPublicKey()) return { error: "Los avisos aún no están configurados en el servidor." };
  const sent = await notifyMember(me.id, {
    title: "Avisos activados",
    body: "Así te llegará cuando te asignen una tarea o te pidan el OK.",
    url: "/settings",
    tag: "prueba",
  });
  return sent ? {} : { error: "No ha llegado a ningún dispositivo. Desactívalos y vuelve a activarlos." };
}
