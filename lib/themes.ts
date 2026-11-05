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
