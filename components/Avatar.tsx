import { THEMES } from "@/lib/themes";
import type { Member } from "@/lib/types";

/** Foto de GitHub si la hay; si no, inicial sobre el color de la persona. */
export default function Avatar({
  member,
  size = 36,
  className = "",
}: {
  member: Member;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (member.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar}
        alt={member.name}
        title={member.name}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      title={member.name}
      style={{ ...style, background: THEMES[member.theme].accent, fontSize: size * 0.4 }}
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}
    >
      {member.name.charAt(0).toUpperCase()}
    </span>
  );
}
