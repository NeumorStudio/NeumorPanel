import Link from "next/link";
import Cover from "./Cover";
import PendingPill from "./PendingPill";
import { getTheme } from "@/lib/themes";
import { projectPath } from "@/lib/paths";
import type { Member, Project } from "@/lib/types";

/** Rejilla de tarjetas de proyecto; la comparten Proyectos y Lab. */
export default function ProjectGrid({
  projects,
  members,
  emptyTitle,
  emptyHint,
}: {
  projects: Project[];
  members: Member[];
  emptyTitle: string;
  emptyHint: string;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#d8dae6] bg-white/60 py-24 text-center">
        <p className="text-xl font-semibold">{emptyTitle}</p>
        <p className="mt-1 text-muted">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {projects.map((p) => {
        const href = projectPath(p);
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
            href={href}
            className="group overflow-hidden rounded-3xl bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <Cover theme={p.theme} className="h-44">
              {pending.length > 0 && (
                <PendingPill tasks={pending} accent={getTheme(p.theme).accent} href={href} />
              )}
            </Cover>
            <div className="p-5">
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="mt-0.5 min-h-6 text-muted">{p.category}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
