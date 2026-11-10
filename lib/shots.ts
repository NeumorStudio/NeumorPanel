import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { del, get, put } from "@vercel/blob";

// Dónde se guardan las capturas de las fichas. Misma idea que lib/db.ts:
//  - Con un almacén de Vercel Blob conectado al proyecto (BLOB_STORE_ID o
//    BLOB_READ_WRITE_TOKEN): en el almacén, en modo PRIVADO. Nadie las abre con
//    un enlace suelto; solo se ven a través del panel (app/api/capturas).
//  - Sin él: en data/capturas/ (solo para desarrollo).

const DATA = path.join(process.cwd(), "data");
const blobConnected = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const TYPE: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };
const SAFE = /^capturas\/[0-9a-f-]{36}\.(webp|jpg|png)$/;

/** La interfaz comprime antes de subir; esto es solo el tope. */
export const MAX_SHOT_BYTES = 3.8 * 1024 * 1024;

export const isShotType = (type: string) => type in EXT;

/** Guarda la imagen y devuelve su ruta (la que se apunta en la tarea). */
export async function saveShot(file: Blob): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Tipo de imagen no admitido");
  const pathname = `capturas/${crypto.randomUUID()}.${ext}`;
  if (blobConnected()) {
    await put(pathname, file, { access: "private", contentType: file.type });
  } else {
    await fs.mkdir(path.join(DATA, "capturas"), { recursive: true });
    await fs.writeFile(path.join(DATA, pathname), Buffer.from(await file.arrayBuffer()));
  }
  return pathname;
}

export async function readShot(
  pathname: string,
): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; type: string } | null> {
  if (!SAFE.test(pathname)) return null;
  if (blobConnected()) {
    const res = await get(pathname, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, type: res.blob.contentType };
  }
  try {
    const buf = await fs.readFile(path.join(DATA, pathname));
    return { body: new Uint8Array(buf), type: TYPE[pathname.split(".").pop() ?? ""] };
  } catch {
    return null;
  }
}

/** Borra imágenes que ya no usa ninguna tarea. Si falla, no rompe nada: solo ocupan sitio. */
export async function deleteShots(pathnames: (string | undefined)[]) {
  const list = pathnames.filter((p): p is string => !!p && SAFE.test(p));
  if (list.length === 0) return;
  try {
    if (blobConnected()) await del(list);
    else await Promise.all(list.map((p) => fs.rm(path.join(DATA, p), { force: true })));
  } catch (e) {
    console.error("No se pudieron borrar capturas", e);
  }
}
