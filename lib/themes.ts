import type { ThemeId } from "./types";

export type Theme = {
  id: ThemeId;
  label: string;
  accent: string; // color sólido (barras de progreso, pestañas)
  bg: string; // degradado de fondo
  shapeA: string; // forma curva grande
  shapeB: string; // forma diagonal translúcida
};

export const THEMES: Record<ThemeId, Theme> = {
  blue: {
    id: "blue",
    label: "Azul",
    accent: "#2f6bff",
    bg: "linear-gradient(135deg,#2f7bf0 0%,#6aa3fb 55%,#9cc0fd 100%)",
    shapeA: "radial-gradient(circle at 60% 90%,#1347d6 0%,#3b83f1 60%,#5b9bf5 100%)",
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.05),rgba(255,255,255,0.45))",
  },
  orange: {
    id: "orange",
    label: "Naranja",
    accent: "#ff8a3d",
    bg: "linear-gradient(135deg,#ff9a62 0%,#ffb27d 50%,#ffd2ae 100%)",
    shapeA: "radial-gradient(circle at 40% 70%,#ff5252 0%,#ff7a59 55%,#ffa061 100%)",
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.05),rgba(255,255,255,0.4))",
  },
  green: {
    id: "green",
    label: "Verde",
    accent: "#4cb877",
    bg: "linear-gradient(135deg,#d3f0dc 0%,#a9dfbd 50%,#7cc99b 100%)",
    shapeA: "radial-gradient(circle at 50% 80%,#3f9e6c 0%,#5db587 60%,#8cd0a8 100%)",
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.5),rgba(255,255,255,0.05))",
  },
  purple: {
    id: "purple",
    label: "Violeta",
    accent: "#7b5fe0",
    bg: "linear-gradient(135deg,#a99af0 0%,#c0b0f7 55%,#d9cdfb 100%)",
    shapeA: "radial-gradient(circle at 60% 80%,#6a4fd3 0%,#8468df 60%,#a58ceb 100%)",
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.05),rgba(255,255,255,0.4))",
  },
  pink: {
    id: "pink",
    label: "Rosa",
    accent: "#ec5b9a",
    bg: "linear-gradient(135deg,#ff8fb8 0%,#ffb0cd 55%,#ffd3e2 100%)",
    shapeA: "radial-gradient(circle at 50% 80%,#e0457f 0%,#f06a9c 60%,#fb94b9 100%)",
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.05),rgba(255,255,255,0.45))",
  },
  teal: {
    id: "teal",
    label: "Turquesa",
    accent: "#14aeb5",
    bg: "linear-gradient(135deg,#43c6c9 0%,#7fdadb 55%,#b6ecec 100%)",
    shapeA: "radial-gradient(circle at 50% 80%,#0c8f9a 0%,#21a9b2 60%,#4fc3c9 100%)",
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.45),rgba(255,255,255,0.05))",
  },
};

export const THEME_LIST = Object.values(THEMES);

// ---------- Colores personalizados ----------

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: string) => HEX.test(v);

/** Acepta un preset ("blue") o un color "#rrggbb"; si no, vuelve al azul. */
export function normalizeTheme(v: string | undefined): string {
  if (!v) return "blue";
  if (v in THEMES) return v;
  return isHex(v) ? v.toLowerCase() : "blue";
}

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => "#" + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;
const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

/** Construye un tema completo (portada, barra, pestañas) a partir de un solo color. */
export function themeFromColor(hex: string): Theme {
  let base = toRgb(hex);
  // un color casi blanco no se vería en la barra de progreso: lo oscurecemos un poco
  if (luminance(base) > 0.78) base = mix(base, BLACK, 0.3);
  const c = (rgb: RGB) => toHex(rgb);
  return {
    id: "blue", // no se usa: es un tema derivado
    label: "Personalizado",
    accent: c(base),
    bg: `linear-gradient(135deg,${c(base)} 0%,${c(mix(base, WHITE, 0.3))} 55%,${c(mix(base, WHITE, 0.55))} 100%)`,
    shapeA: `radial-gradient(circle at 55% 85%,${c(mix(base, BLACK, 0.28))} 0%,${c(base)} 60%,${c(mix(base, WHITE, 0.15))} 100%)`,
    shapeB: "linear-gradient(120deg,rgba(255,255,255,0.05),rgba(255,255,255,0.42))",
  };
}

/** Tema de un proyecto: preset o color personalizado. */
export function getTheme(theme: string): Theme {
  if (theme in THEMES) return THEMES[theme as ThemeId];
  return isHex(theme) ? themeFromColor(theme) : THEMES.blue;
}
