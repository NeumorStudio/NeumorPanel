import { getTheme } from "@/lib/themes";

export default function ProgressBar({ value, theme }: { value: number; theme: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-2 flex-1 rounded-full bg-[#ececf4] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: getTheme(theme).accent }}
        />
      </div>
      <span className="text-sm tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}
