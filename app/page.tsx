import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import NewProjectButton from "@/components/NewProjectButton";
import ProjectGrid from "@/components/ProjectGrid";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireUser();
  const { projects, members } = await readDB();

  return (
    <div>
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Proyectos</h1>
        <NewProjectButton members={members} />
      </header>
      <ProjectGrid
        projects={projects.filter((p) => p.kind !== "lab")}
        members={members}
        emptyTitle="Aún no hay proyectos"
        emptyHint="Crea el primero con “Nuevo proyecto”."
      />
    </div>
  );
}
