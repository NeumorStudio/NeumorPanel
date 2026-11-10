import ProjectScreen from "@/components/ProjectScreen";

export const dynamic = "force-dynamic";

export default async function LabProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tarea?: string | string[] }>;
}) {
  const { id } = await params;
  const { tarea } = await searchParams;
  return <ProjectScreen id={id} section="lab" openTask={typeof tarea === "string" ? tarea : undefined} />;
}
