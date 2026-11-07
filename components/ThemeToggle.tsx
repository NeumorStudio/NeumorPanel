"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "neumorpanel-theme";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const getDark = () => document.documentElement.dataset.theme === "dark";

export default function ThemeToggle({ className = "", label = false }: { className?: string; label?: boolean }) {
  const dark = useSyncExternalStore(subscribe, getDark, () => false);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  const Icon = dark ? Sun : Moon;
  const text = dark ? "Modo claro" : "Modo oscuro";
  return (
    <button onClick={toggle} aria-label={text} title={text} className={className}>
      <Icon size={label ? 20 : 22} strokeWidth={1.8} className="shrink-0" />
      {label ? <span>{text}</span> : text}
    </button>
  );
}
