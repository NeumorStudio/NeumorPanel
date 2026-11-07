import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth();
  if (session?.login) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-5 grid w-fit grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-4 rounded-full bg-[#a3a7bf]" />
          ))}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">NeumorPanel</h1>
        <p className="mt-1 text-muted">Los proyectos de NeumorStudio</p>

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "AccessDenied"
              ? "Tu usuario de GitHub no está en el equipo. Pide que te inviten desde Ajustes."
              : "No se pudo iniciar sesión. Inténtalo de nuevo."}
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-ink py-3.5 font-medium text-onink transition hover:opacity-90 active:scale-[0.98]">
            <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            Entrar con GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
