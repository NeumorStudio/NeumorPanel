import type { Project, ProjectKind } from "./types";

/** Cada sección vive en su ruta: "/" para clientes y "/lab" para pruebas. */
export const sectionPath = (kind?: ProjectKind) => (kind === "lab" ? "/lab" : "/");

export const projectPath = (p: Pick<Project, "id" | "kind">) =>
  p.kind === "lab" ? `/lab/${p.id}` : `/projects/${p.id}`;
