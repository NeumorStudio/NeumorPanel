"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ProjectDialog from "./ProjectDialog";
import type { Member } from "@/lib/types";

export default function NewProjectButton({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-medium text-white shadow-[0_8px_20px_rgba(47,107,255,0.35)] transition hover:brightness-110 active:scale-[0.98]"
      >
        <Plus size={20} />
        <span className="hidden sm:inline">Nuevo proyecto</span>
      </button>
      {open && <ProjectDialog members={members} onClose={() => setOpen(false)} />}
    </>
  );
}
