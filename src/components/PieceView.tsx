"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Piece } from "@/lib/types";
import { PIECE_FORMS } from "@/lib/types";
import { toLrc } from "@/lib/segments";
import { toPersianDigits } from "@/lib/time";
import { api } from "@/lib/api";
import { AudioPlayer } from "./AudioPlayer";
import { LyricsStage } from "./LyricsStage";
import { useAudioEngine } from "./useAudioEngine";

export function PieceView({ piece, admin }: { piece: Piece; admin: boolean }) {
  const router = useRouter();
  const engine = useAudioEngine(piece.audioUrl);
  const [autoScroll, setAutoScroll] = useState(true);
  const [busy, setBusy] = useState(false);

  const form = PIECE_FORMS.find((f) => f.value === piece.form)?.label ?? "شعر";

  const remove = async () => {
    if (!window.confirm(`«${piece.title}» برای همیشه حذف شود؟`)) return;
    setBusy(true);
    try {
      await api.deletePiece(piece.id);
      router.push("/");
      router.refresh();
    } catch (error) {
      window.alert((error as Error).message);
      setBusy(false);
    }
  };

  const downloadLrc = () => {
    const blob = new Blob([toLrc(piece.segments)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${piece.title || "shahriar"}.lrc`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-accent={piece.accent} className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-5 pb-40 pt-8">
      <audio ref={engine.audioRef} src={piece.audioUrl} preload="metadata" crossOrigin="anonymous" />

      <header className="text-center">
        <span className="rounded-full border border-[rgb(var(--accent))]/25 bg-[rgb(var(--accent))]/10 px-3 py-1 text-[11px] text-[rgb(var(--accent-soft))]">
          {form}
        </span>
        <h1 className="mt-4 text-2xl font-bold leading-relaxed sm:text-3xl">{piece.title}</h1>
        {piece.poet && <p className="mt-2 text-sm text-paper-dim">{piece.poet}</p>}
        {piece.note && (
          <p className="mx-auto mt-4 max-w-xl text-balance text-xs leading-7 text-paper-faint">
            {piece.note}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {admin && (
            <Link href={`/p/${piece.id}/edit`} className="btn btn-ghost !py-1.5 !text-xs">
              ویرایش زمان‌بندی
            </Link>
          )}
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className="btn btn-ghost !py-1.5 !text-xs"
          >
            پیمایش خودکار: {autoScroll ? "روشن" : "خاموش"}
          </button>
          {piece.segments.length > 0 && (
            <button type="button" onClick={downloadLrc} className="btn btn-ghost !py-1.5 !text-xs">
              خروجی LRC
            </button>
          )}
          {admin && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="btn btn-danger !py-1.5 !text-xs"
            >
              حذف
            </button>
          )}
        </div>
      </header>

      <LyricsStage
        segments={piece.segments}
        currentTime={engine.currentTime}
        onSeek={engine.seek}
        autoScroll={autoScroll}
        className="mt-6 max-h-[58dvh] flex-1"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-5 py-3">
          <AudioPlayer engine={engine} segments={piece.segments} compact />
          <p className="mt-1 text-center text-[11px] text-paper-faint">
            برای رفتن به هر مصرع، روی آن بزنید ·{" "}
            {toPersianDigits(piece.segments.length)} سطرِ هم‌زمان
          </p>
        </div>
      </div>
    </div>
  );
}
