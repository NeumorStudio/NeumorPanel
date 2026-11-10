/**
 * Reduce una captura antes de subirla: como mucho 1600 px de ancho (y 4000 de
 * alto, para capturas de página entera), en WebP o, si el navegador no sabe, JPG.
 * Una captura normal se queda en unos 100-300 KB.
 */
const MAX_W = 1600;
const MAX_H = 4000;
const MAX_BYTES = 3.5 * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bmp.width, MAX_H / bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin canvas");
  ctx.fillStyle = "#fff"; // las zonas transparentes, en blanco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    let out = await encode(canvas, "image/webp", quality);
    if (!out || out.type !== "image/webp") out = await encode(canvas, "image/jpeg", quality);
    if (out && out.size <= MAX_BYTES) return out;
  }
  throw new Error("La captura es demasiado grande");
}
