"use client";

import { useSyncExternalStore } from "react";

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function format(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000; // segundos (negativo = pasado)
  const abs = Math.abs(diff);
  if (abs < 60) return "ahora mismo";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// Reloj compartido: avisa cada minuto para refrescar los "hace X".
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
}

/** "hace 2 h". En el servidor no pinta nada, así no se desajusta con el cliente. */
export default function RelativeTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => format(iso),
    () => "",
  );

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("es-ES")} suppressHydrationWarning>
      {text}
    </time>
  );
}
