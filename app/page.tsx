import Link from "next/link";
import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { progressOf } from "@/lib/types";
import Cover from "@/components/Cover";
import ProgressBar from "@/components/ProgressBar";
import NewProjectButton from "@/components/NewProjectButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireUser();
  const { projects, members } = await readDB();

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
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <Cover theme={p.theme} className="h-44" />
              <div className="p-5">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="mt-0.5 text-muted min-h-6">{p.category}</p>
                <div className="mt-4">
                  <ProgressBar value={progressOf(p.tasks)} theme={p.theme} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
