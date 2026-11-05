import type { Member, Project } from "./types";

/**
 * Quién participa en un proyecto. Si el proyecto no guarda una lista
 * (los creados antes de esta función), participa todo el equipo.
 */
export function participantsOf(project: Pick<Project, "members">, members: Member[]): Member[] {
  const ids = project.members;
  return ids ? members.filter((m) => ids.includes(m.id)) : members;
}
