import { THEMES } from "@/lib/themes";
import type { ThemeId } from "@/lib/types";

/** Portada abstracta con curvas suaves, inspirada en el diseño de referencia. */
export default function Cover({
  theme,
  className = "",
  children,
}: {
  theme: ThemeId;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = THEMES[theme];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: t.bg }}
    >
      <div
        className="absolute -right-[10%] -top-[40%] h-[130%] w-[75%] rounded-full"
        style={{ background: t.shapeB }}
      />
      <div
        className="absolute left-[8%] top-[42%] h-[130%] w-[85%] rounded-[50%]"
        style={{ background: t.shapeA, opacity: 0.92 }}
      />
      {children}
    </div>
  );
}
