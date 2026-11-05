import { FolderKanban, Link2, ListChecks } from "lucide-react";
import Avatar from "./Avatar";
import RelativeTime from "./RelativeTime";
import type { ActivityType, Member, Project } from "@/lib/types";

const ICONS: Record<ActivityType, typeof ListChecks> = {
  task: ListChecks,
  link: Link2,
  project: FolderKanban,
};

export default function ActivityTab({ project, members }: { project: Project; members: Member[] }) {
  const items = project.activity ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#d8dae6] bg-white/60 py-14 text-center">
        <p className="font-semibold">Todavía no hay actividad</p>
        <p className="mt-1 text-muted">Aquí aparecerá cada cambio: tareas, enlaces y ajustes del proyecto.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-1">
      {items.map((a) => {
        const who = members.find((m) => m.id === a.by);
        const Icon = ICONS[a.type] ?? ListChecks;
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-2xl px-2 py-3 hover:bg-white/70">
            {who ? (
              <Avatar member={who} size={34} />
            ) : (
              <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#e3e5ef] text-sm text-muted">
                ?
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="break-words">
                <span className="font-semibold">{who?.name ?? "Alguien"}</span> {a.text}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                <Icon size={13} /> <RelativeTime iso={a.at} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
