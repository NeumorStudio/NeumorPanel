"use client";

import { useRef, useState } from "react";

// ---- conversión HSV <-> hex (h: 0-360, s y v: 0-1) ----
function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, max ? d / max : 0, max];
}

const SIZE = 184;

/** Rueda de color: tono alrededor, intensidad hacia el centro y brillo en el deslizador. */
export default function ColorWheel({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [[h, s, v], setHsv] = useState(() => hexToHsv(value));
  const [hexText, setHexText] = useState(value);
  const disc = useRef<HTMLDivElement>(null);

  function emit(nh: number, ns: number, nv: number) {
    setHsv([nh, ns, nv]);
    const hex = hsvToHex(nh, ns, nv);
    setHexText(hex);
    onChange(hex);
  }

  function pick(e: React.PointerEvent) {
    const rect = disc.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const hue = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360; // 0° arriba, en sentido horario
    const sat = Math.min(1, Math.hypot(dx, dy) / (rect.width / 2));
    emit(hue, sat, v);
  }

  const rad = (h * Math.PI) / 180;
  const pureHex = hsvToHex(h, s, 1);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        ref={disc}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && pick(e)}
        className="relative shrink-0 cursor-crosshair touch-none select-none rounded-full shadow-inner"
        style={{
          width: SIZE,
          height: SIZE,
          background:
            "radial-gradient(circle closest-side, #fff 0%, rgba(255,255,255,0) 100%), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        role="slider"
        aria-label="Tono e intensidad del color"
        aria-valuetext={hexText}
        aria-valuenow={Math.round(h)}
      >
        {/* el brillo oscurece toda la rueda */}
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: `rgba(0,0,0,${1 - v})` }} />
        <span
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.3)]"
          style={{
            left: `${50 + s * 50 * Math.sin(rad)}%`,
            top: `${50 - s * 50 * Math.cos(rad)}%`,
            background: hsvToHex(h, s, v),
          }}
        />
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
        <label className="text-sm text-muted">
          Brillo
          <input
            type="range"
            min={15}
            max={100}
            value={Math.round(v * 100)}
            onChange={(e) => emit(h, s, Number(e.target.value) / 100)}
            className="mt-1.5 block h-3 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#161821] [&::-webkit-slider-thumb]:shadow-md"
            style={{ background: `linear-gradient(90deg, #000, ${pureHex})` }}
          />
        </label>
        <label className="text-sm text-muted">
          Código
          <div className="mt-1.5 flex items-center gap-2">
            <span className="size-9 shrink-0 rounded-lg border border-line" style={{ background: hsvToHex(h, s, v) }} />
            <input
              value={hexText}
              onChange={(e) => {
                const t = e.target.value.trim();
                setHexText(t);
                if (/^#[0-9a-f]{6}$/i.test(t)) {
                  setHsv(hexToHsv(t));
                  onChange(t.toLowerCase());
                }
              }}
              onBlur={() => setHexText(hsvToHex(h, s, v))}
              spellCheck={false}
              maxLength={7}
              className="w-full min-w-0 rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-base uppercase text-foreground outline-none focus:border-primary sm:text-sm"
            />
          </div>
        </label>
      </div>
    </div>
  );
}
