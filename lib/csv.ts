export type ImportRow = { service: string; username: string; password: string; url: string; notes: string };

/** CSV con comillas, comas y saltos de línea dentro de campos. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

const ALIASES: Record<keyof ImportRow, string[]> = {
  service: ["name", "title", "nombre", "titulo"],
  url: ["url", "login_uri", "website", "web", "sitio"],
  username: ["username", "login_username", "user", "usuario", "email"],
  password: ["password", "login_password", "contraseña", "contrasena"],
  notes: ["note", "notes", "notas", "nota"],
};

/** Lee el CSV exportado por Google/Chrome, Bitwarden, 1Password… Devuelve null si no reconoce las columnas. */
export function rowsFromCSV(text: string): ImportRow[] | null {
  const all = parseCSV(text);
  if (all.length < 2) return null;
  const head = all[0].map((h) => h.trim().toLowerCase());
  const idx = {} as Record<keyof ImportRow, number>;
  for (const k of Object.keys(ALIASES) as (keyof ImportRow)[]) {
    idx[k] = head.findIndex((h) => ALIASES[k].includes(h));
  }
  if (idx.password < 0 || (idx.url < 0 && idx.service < 0)) return null;
  const get = (r: string[], k: keyof ImportRow) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
  return all.slice(1).flatMap((r) => {
    const url = get(r, "url");
    let service = get(r, "service");
    if (!service && url) {
      try {
        service = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        service = url;
      }
    }
    const password = idx.password >= 0 ? (r[idx.password] ?? "") : "";
    if (!service || (!password && !get(r, "username"))) return [];
    return [{ service, url, username: get(r, "username"), password, notes: get(r, "notes") }];
  });
}
