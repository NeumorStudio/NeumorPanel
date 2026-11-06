import { notFound, redirect } from "next/navigation";
import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { projectPath, sectionPath } from "@/lib/paths";
import ProjectView from "./ProjectView";
import type { ProjectKind } from "@/lib/types";

/** Detalle de un proyecto. Si se abre desde la sección equivocada, redirige a la suya. */
export default async function ProjectScreen({ id, section }: { id: string; section: ProjectKind }) {
  await requireUser();
  const db = await readDB();
  const project = db.projects.find((p) => p.id === id);
  if (!project) notFound();
  if ((project.kind === "lab" ? "lab" : "client") !== section) redirect(projectPath(project));

  return (
    <ProjectView
      key={project.id + project.theme + (project.areas ?? []).join("|") + (project.members ?? []).join("|")}
      project={project}
      members={db.members}
      backHref={sectionPath(project.kind)}
    />
  );
}
