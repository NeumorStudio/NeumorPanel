import Link from "next/link";
import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getTheme } from "@/lib/themes";
import Cover from "@/components/Cover";
import NewProjectButton from "@/components/NewProjectButton";
import PendingPill from "@/components/PendingPill";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireUser();
  const { projects, members } = await readDB();
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <div>
      <header className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Proyectos</h1>
        <NewProjectButton members={members} />
      </header>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#d8dae6] bg-white/60 py-24 text-center">
          <p className="text-xl font-semibold">Aún no hay proyectos</p>
          <p className="mt-1 text-muted">Crea el primero con “Nuevo proyecto”.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p) => {
            const pending = p.tasks
              .filter((t) => t.status !== "done")
              .map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                assignee: t.assignee ? byId.get(t.assignee) : undefined,
              }));
            return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <Cover theme={p.theme} className="h-44">
                {pending.length > 0 && (
                  <PendingPill tasks={pending} accent={getTheme(p.theme).accent} href={`/projects/${p.id}`} />
                )}
              </Cover>
              <div className="p-5">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="mt-0.5 text-muted min-h-6">{p.category}</p>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
