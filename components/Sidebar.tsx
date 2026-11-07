"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { FlaskConical, FolderKanban, Settings } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Proyectos", icon: FolderKanban },
  { href: "/lab", label: "Lab", icon: FlaskConical },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/projects") : pathname.startsWith(href);

  return (
    <>
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col gap-8 border-r border-line bg-soft px-3 py-6 sm:flex">
      <Link href="/" className="flex items-center gap-3 px-2" aria-label="NeumorPanel">
        <span className="grid grid-cols-2 gap-1 shrink-0">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-3 rounded-full bg-[#a3a7bf]" />
          ))}
        </span>
        <span className="font-semibold tracking-tight">NeumorPanel</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
              isActive(href)
                ? "bg-soft3 text-foreground font-medium"
                : "text-muted hover:bg-soft2"
            }`}
          >
            <Icon size={20} strokeWidth={1.8} className="shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <ThemeToggle
        label
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-muted transition-colors hover:bg-soft2"
      />
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${isActive(href) ? "font-medium text-primary" : "text-muted"}`}
        >
          <Icon size={22} strokeWidth={1.8} />
          {label}
        </Link>
      ))}
      <ThemeToggle className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-muted" />
    </nav>
    </>
  );
}
