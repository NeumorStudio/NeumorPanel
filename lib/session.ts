import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowed } from "./access";

/** Exige un usuario con sesión que siga en el equipo. Úsalo en páginas y acciones. */
export async function requireUser() {
  const session = await auth();
  if (!session?.login) redirect("/login");
  const member = await isAllowed(session.login);
  if (!member) redirect("/login?error=AccessDenied");
  return member;
}
