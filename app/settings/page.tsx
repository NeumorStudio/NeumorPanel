import { readDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import MembersForm from "@/components/MembersForm";
import PushSettings from "@/components/PushSettings";
import { pushPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  const { members } = await readDB();
  return (
    <div>
      <h1 className="mb-8 text-4xl sm:text-5xl font-bold tracking-tight">Ajustes</h1>
      <div className="flex max-w-xl flex-col gap-6">
        <PushSettings publicKey={pushPublicKey()} />
        <MembersForm initial={members} meId={me.id} />
      </div>
    </div>
  );
}
