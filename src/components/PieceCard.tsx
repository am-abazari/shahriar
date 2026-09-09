import Link from "next/link";
import type { PieceSummary } from "@/lib/types";
import { PIECE_FORMS } from "@/lib/types";
import { formatTimeFa, toPersianDigits } from "@/lib/time";

export function PieceCard({ piece }: { piece: PieceSummary }) {
  const form = PIECE_FORMS.find((f) => f.value === piece.form)?.label ?? "شعر";

  return (
    <Link
      href={`/p/${piece.id}`}
      data-accent={piece.accent}
      className="group glass relative flex flex-col overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:border-[rgb(var(--accent))]/40"
    >
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition duration-500 group-hover:opacity-40"
        style={{ background: "rgb(var(--accent))" }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="rounded-full border border-[rgb(var(--accent))]/25 bg-[rgb(var(--accent))]/10 px-2.5 py-1 text-[11px] text-[rgb(var(--accent-soft))]">
          {form}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-paper-faint" dir="ltr">
          {formatTimeFa(piece.duration)}
        </span>
      </div>

      <h3 className="relative mt-4 text-lg font-bold leading-8 text-paper">{piece.title}</h3>
      {piece.poet && <p className="relative mt-1 text-sm text-paper-dim">{piece.poet}</p>}
      {piece.note && (
        <p className="relative mt-3 line-clamp-2 text-xs leading-6 text-paper-faint">{piece.note}</p>
      )}

      <div className="relative mt-5 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-[11px] text-paper-faint">
          {piece.segmentCount > 0
            ? `${toPersianDigits(piece.segmentCount)} سطرِ هم‌زمان`
            : "بدون زمان‌بندی"}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[rgb(var(--accent-soft))] opacity-0 transition group-hover:opacity-100">
          شنیدن
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
