import ProjectScreen from "@/components/ProjectScreen";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectScreen id={id} section="client" />;
}
