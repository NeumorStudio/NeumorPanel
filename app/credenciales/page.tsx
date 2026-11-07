import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { decrypt, unlockedKey, type Secret } from "@/lib/vault";
import VaultGate from "@/components/VaultGate";
import VaultView, { type Credential } from "@/components/VaultView";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  const me = await requireUser();
  const { vault, projects } = await readDB();
  const key = vault ? await unlockedKey(me.id) : null;

  let body;
  if (!vault) body = <VaultGate mode="setup" />;
  else if (!key) body = <VaultGate mode="unlock" />;
  else {
    const items: Credential[] = vault.items.flatMap((i) => {
      const s = decrypt<Secret>(key, i.blob);
      return s ? [{ id: i.id, projectId: i.projectId, ...s }] : [];
    });
    body = (
      <VaultView
        items={items}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Credenciales</h1>
        <p className="mt-2 text-muted">Accesos de los proyectos, cifrados con la contraseña del equipo.</p>
      </header>
      {body}
    </div>
  );
}
