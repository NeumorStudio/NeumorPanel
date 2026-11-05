import { notFound } from "next/navigation";
import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import ProjectView from "@/components/ProjectView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  await requireUser();
  const { id } = await params;
  const db = await readDB();
  const project = db.projects.find((p) => p.id === id);
  if (!project) notFound();
  return <ProjectView key={project.id + project.theme + (project.areas ?? []).join("|") + (project.members ?? []).join("|")} project={project} members={db.members} />;
}
