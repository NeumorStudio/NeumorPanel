import { auth } from "@/auth";
import { isAllowed } from "@/lib/access";
import { readDB } from "@/lib/db";
import { readShot } from "@/lib/shots";

/** Sirve una captura de una ficha. Solo para quien ha entrado y sigue en el equipo. */
export async function GET(_req: Request, ctx: RouteContext<"/api/capturas/[id]">) {
  const session = await auth();
  if (!session?.login || !(await isAllowed(session.login))) {
    return new Response("No autorizado", { status: 401 });
  }
  const { id } = await ctx.params;
  const db = await readDB();
  const shot = db.projects
    .flatMap((p) => p.tasks)
    .flatMap((t) => t.shots ?? [])
    .find((s) => s.id === id);
  const file = shot?.image ? await readShot(shot.image) : null;
  if (!file) return new Response("No encontrada", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": file.type,
      // la imagen de una captura no cambia nunca: la guarda el navegador, nadie más
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
