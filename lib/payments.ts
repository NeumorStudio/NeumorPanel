import type { Payment, Project } from "./types";

const madridDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" });

/** Fecha de hoy en España como "AAAA-MM-DD" (igual en el servidor y en el navegador). */
export const todayISO = () => madridDay.format(new Date());

/** Cobros del más reciente al más antiguo. */
export const sortedPayments = (project: Project): Payment[] =>
  [...(project.payments ?? [])].sort((a, b) => b.paidOn.localeCompare(a.paidOn));

/** El próximo pago es el que se apuntó en el último cobro. */
export const nextDueOf = (project: Project) => sortedPayments(project)[0]?.nextDue;

/** Vencido: la fecha del próximo pago ya pasó y no se ha apuntado un cobro nuevo. */
export const isOverdue = (nextDue: string | undefined, today: string) => !!nextDue && nextDue < today;
