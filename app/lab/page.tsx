import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import NewProjectButton from "@/components/NewProjectButton";
import ProjectGrid from "@/components/ProjectGrid";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  await requireUser();
  const { projects, members } = await readDB();

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Lab</h1>
          <p className="mt-2 text-muted">Pruebas y proyectos propios, sin encargo de por medio.</p>
        </div>
        <NewProjectButton members={members} kind="lab" />
      </header>
      <ProjectGrid
        projects={projects.filter((p) => p.kind === "lab")}
        members={members}
        emptyTitle="El Lab está vacío"
        emptyHint="Aquí van los experimentos que hacéis porque queréis. Crea el primero."
      />
    </div>
  );
}
