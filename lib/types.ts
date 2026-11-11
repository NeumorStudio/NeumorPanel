/** "review" = Revisar: quien la mueve ahí pide el OK a los demás. */
export type TaskStatus = "todo" | "doing" | "review" | "done";

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "Por hacer" },
  { id: "doing", label: "En curso" },
  { id: "review", label: "Revisar" },
  { id: "done", label: "Hecho" },
];

/** Paso de una tarea: casilla dentro de la ficha. */
export type TaskStep = {
  id: string;
  text: string;
  done: boolean;
};

/**
 * Resultado de una tarea: una captura, un enlace o las dos cosas
 * (la captura para verlo sin salir del panel y el enlace a lo real).
 */
export type TaskShot = {
  id: string;
  label: string; // p. ej. "Instagram"
  url?: string; // lo real: el perfil, la preview, la web…
  image?: string; // ruta de la imagen en el almacén privado (ver lib/shots.ts)
  by: string; // id del miembro
  at: string; // ISO
};

/** Último veredicto de la revisión: se queda en la ficha. */
export type TaskVerdict = {
  kind: "ok" | "changes";
  note?: string; // por qué se piden cambios
  by: string;
  at: string;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string; // YYYY-MM-DD
  area?: string; // una de las partes del proyecto (p. ej. "Web", "Cliente")
  assignee?: string; // id del miembro responsable
  // --- Ficha (todo opcional: una tarea sencilla sigue siendo un título) ---
  briefFrom?: string; // quién lo pidió (p. ej. "Humberto")
  brief?: string; // lo que pidió, con sus palabras
  notes?: string; // lo que hay hecho ya
  steps?: TaskStep[];
  shots?: TaskShot[];
  reviewBy?: string; // quién la pasó a Revisar (le toca a los demás)
  verdict?: TaskVerdict;
};

export type ThemeId = "blue" | "orange" | "green" | "purple" | "pink" | "teal";

export type ProjectLink = {
  id: string;
  title: string;
  url: string;
  by: string; // id del miembro que lo añadió
  at: string; // ISO
};

export type ActivityType = "project" | "task" | "link";

export type Activity = {
  id: string;
  type: ActivityType;
  text: string; // p. ej. «movió “Diseñar” a Hecho»
  by: string; // id del miembro
  at: string; // ISO
};

/** "lab" = proyectos de prueba propios; sin valor = proyecto de cliente. */
export type ProjectKind = "client" | "lab";

export type Project = {
  id: string;
  name: string;
  category: string;
  description: string;
  kind?: ProjectKind;
  theme: string; // preset ("blue") o color personalizado ("#8a3ffc")
  dueDate?: string;
  tasks: Task[];
  areas?: string[]; // partes del proyecto, para etiquetar tareas
  members?: string[]; // ids de los participantes (si falta: todo el equipo)
  links?: ProjectLink[];
  activity?: Activity[]; // la más reciente primero
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  theme: ThemeId;
  github?: string; // usuario de GitHub (con él se inicia sesión)
  avatar?: string; // foto de GitHub
};

/** Credencial cifrada: todo lo sensible va dentro de `blob` (AES-256-GCM). */
export type VaultItem = {
  id: string;
  projectId?: string;
  blob: string;
  by: string;
  at: string;
};

export type Vault = {
  salt: string; // base64, para derivar la clave desde la contraseña maestra
  check: string; // blob cifrado de comprobación: sirve para validar la contraseña
  items: VaultItem[];
  fails?: number;
  lockUntil?: number;
};

/**
 * Un dispositivo que recibe avisos (suscripción Web Push de un navegador o de la app
 * instalada). Solo lo usa el servidor: nunca se manda al navegador.
 */
export type PushSub = {
  id: string;
  memberId: string; // a quién se avisa en este dispositivo
  endpoint: string; // dirección del servicio de avisos del navegador
  keys: { p256dh: string; auth: string };
  at: string; // ISO
};

export type DB = {
  members: Member[];
  projects: Project[];
  vault?: Vault;
  push?: PushSub[];
};
