"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Send } from "lucide-react";
import { savePushSubscription, sendTestPush } from "@/app/push-actions";
import { stopPushHere, toKey } from "@/lib/push-client";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Lo que se puede saber sin esperar a nada. */
function detect(): State {
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!ok) return isIOS() && !isInstalled() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "loading";
}

/**
 * Ajustes → Avisos: cada persona los activa en sus dispositivos y solo le llegan
 * las tareas que le asignan a ella.
 */
export default function PushSettings({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [installed, setInstalled] = useState(true);
  const reg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let alive = true;
    Promise.resolve()
      .then(async () => {
        setInstalled(isInstalled());
        const env = detect();
        if (env !== "loading") return setState(env);
        reg.current = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.current.pushManager.getSubscription();
        if (!alive) return;
        const on = Boolean(sub) && Notification.permission === "granted";
        setState(on ? "on" : "off");
        // vuelve a apuntarlo por si el servidor lo había borrado o era de otra persona
        if (on && sub) await savePushSubscription(sub.toJSON());
      })
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey || !reg.current) return;
    setBusy(true);
    setNote(null);
    try {
      const opts = { userVisibleOnly: true, applicationServerKey: toKey(publicKey) };
      let sub: PushSubscription;
      try {
        // primero de todo: Safari solo pide permiso si va justo después del toque
        sub = await reg.current.pushManager.subscribe(opts);
      } catch (e) {
        // una suscripción vieja con otra clave impide crear la nueva
        const old = await reg.current.pushManager.getSubscription();
        if (!old) throw e;
        await old.unsubscribe();
        sub = await reg.current.pushManager.subscribe(opts);
      }
      const res = await savePushSubscription(sub.toJSON());
      if (res.error) {
        await sub.unsubscribe().catch(() => undefined);
        setNote({ ok: false, text: res.error });
        return;
      }
      setState("on");
      setNote({ ok: true, text: "Listo. Toca «Probar» para ver cómo te llega." });
    } catch {
      const perm = Notification.permission;
      if (perm === "denied") setState("denied");
      else if (perm === "default") setNote({ ok: false, text: "Hace falta que aceptes el permiso de avisos." });
      else setNote({ ok: false, text: "No se han podido activar en este navegador." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote(null);
    await stopPushHere();
    setState("off");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setNote(null);
    const res = await sendTestPush();
    setNote(res.error ? { ok: false, text: res.error } : { ok: true, text: "Enviado: te llegará en unos segundos." });
    setBusy(false);
  }

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-card">
      <h2 className="text-xl font-semibold">Avisos</h2>
      <p className="mb-5 text-muted">
        Te avisa en este dispositivo cuando te asignan una tarea. Solo las tuyas.
      </p>

      {!publicKey ? (
        <p className="text-sm text-muted">Falta configurarlos en el servidor (claves VAPID en Vercel).</p>
      ) : state === "loading" ? (
        <p className="text-sm text-muted">Comprobando este dispositivo…</p>
      ) : state === "install" ? (
        <p className="text-sm leading-relaxed">
          En el iPhone solo llegan con el panel instalado: en Safari, botón <b>Compartir</b> →{" "}
          <b>Añadir a pantalla de inicio</b>. Después abre el panel desde ese icono y actívalos aquí.
        </p>
      ) : state === "unsupported" ? (
        <p className="text-sm text-muted">Este navegador no puede recibir avisos.</p>
      ) : state === "denied" ? (
        <p className="text-sm leading-relaxed">
          Los avisos del panel están <b>bloqueados</b> en este navegador. Permítelos en los ajustes del sitio y
          vuelve a esta página.
        </p>
      ) : state === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 font-medium">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-white">
              <Check size={14} strokeWidth={3} />
            </span>
            Activados en este dispositivo
          </span>
          <span className="flex gap-2 sm:ml-auto">
            <button
              disabled={busy}
              onClick={test}
              className="flex items-center gap-2 rounded-xl bg-soft2 px-4 py-2 font-medium hover:bg-soft3 disabled:opacity-60"
            >
              <Send size={16} /> Probar
            </button>
            <button
              disabled={busy}
              onClick={disable}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted hover:text-foreground disabled:opacity-60"
            >
              <BellOff size={16} /> Desactivar
            </button>
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            disabled={busy}
            onClick={enable}
            className="flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-[0_6px_16px_rgba(47,107,255,0.3)] hover:brightness-110 disabled:opacity-60"
          >
            <Bell size={18} /> Activar avisos
          </button>
          {!installed && (
            <p className="text-sm text-muted">
              Mejor con el panel instalado como app: menú del navegador → «Instalar app» o «Añadir a pantalla de
              inicio».
            </p>
          )}
        </div>
      )}

      {note && <p className={`mt-3 text-sm ${note.ok ? "text-muted" : "text-red-600"}`}>{note.text}</p>}
    </section>
  );
}
