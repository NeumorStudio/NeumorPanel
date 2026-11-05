import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import MembersForm from "@/components/MembersForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  const { members } = await readDB();
  return (
    <div>
      <h1 className="mb-8 text-4xl sm:text-5xl font-bold tracking-tight">Ajustes</h1>
      <MembersForm initial={members} meId={me.id} />
    </div>
  );
}
