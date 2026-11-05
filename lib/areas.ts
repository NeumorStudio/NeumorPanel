import { THEME_LIST } from "./themes";

export const MAX_AREAS = 8;
export const MAX_AREA_LENGTH = 24;

/** Limpia la lista de partes: sin vacías ni repetidas, con límites. */
export function normalizeAreas(input?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input ?? []) {
    const name = raw.trim().slice(0, MAX_AREA_LENGTH);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_AREAS) break;
  }
  return out;
}

/** Cada parte tiene un color fijo según su posición en la lista del proyecto. */
export function areaColor(areas: string[] | undefined, name: string): string {
  const i = Math.max(0, (areas ?? []).indexOf(name));
  return THEME_LIST[i % THEME_LIST.length].accent;
}
