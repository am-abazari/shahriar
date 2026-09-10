"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Piece } from "@/lib/types";
import { PIECE_FORMS } from "@/lib/types";
import { findActiveIndex, sortSegments, toLrc } from "@/lib/segments";
import { toPersianDigits } from "@/lib/time";
import { api } from "@/lib/api";
import { AudioPlayer } from "./AudioPlayer";
import { LyricsStage } from "./LyricsStage";
import { useAudioEngine } from "./useAudioEngine";

export function PieceView({ piece, admin }: { piece: Piece; admin: boolean }) {
  const router = useRouter();
  const engine = useAudioEngine(piece.audioUrl);
  const [autoScroll, setAutoScroll] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [busy, setBusy] = useState(false);

  const form = PIECE_FORMS.find((f) => f.value === piece.form)?.label ?? "شعر";
  const ordered = useMemo(() => sortSegments(piece.segments), [piece.segments]);
  const activeIndex = findActiveIndex(ordered, engine.currentTime);

  const { seek } = engine;

  /** پرش به سطر شماره‌ی index؛ کمی جلوتر از مرز تا خودِ سطر فعال شود. */
  const goToVerse = useCallback(
    (index: number) => {
      const target = ordered[index];
      if (target) seek(target.start + 0.01);
    },
    [ordered, seek],
  );

  const prevVerse = useCallback(() => {
    if (!ordered.length) return;
    const current = findActiveIndex(ordered, engine.currentTime);
    if (current < 0) {
      // بیرون از هر سطر: به آخرین سطری که گذشته‌ایم برمی‌گردیم.
      const passed = ordered.filter((s) => s.end <= engine.currentTime).length - 1;
      goToVerse(Math.max(0, passed));
      return;
    }
    // مثل پخش‌کننده‌های موسیقی: اگر بیش از دو ثانیه از سطر گذشته، اول به ابتدای خودش برگردیم.
    const elapsed = engine.currentTime - ordered[current].start;
    goToVerse(elapsed > 2 ? current : Math.max(0, current - 1));
  }, [engine.currentTime, goToVerse, ordered]);

  const nextVerse = useCallback(() => {
    if (!ordered.length) return;
    const current = findActiveIndex(ordered, engine.currentTime);
    if (current >= 0) {
      goToVerse(Math.min(ordered.length - 1, current + 1));
      return;
    }
    const upcoming = ordered.findIndex((s) => s.start > engine.currentTime);
    goToVerse(upcoming >= 0 ? upcoming : ordered.length - 1);
  }, [engine.currentTime, goToVerse, ordered]);

  // تکرار بیت: وقتی زمان از پایان سطر فعال رد شد، به ابتدای همان سطر برمی‌گردیم.
  const repeatIndex = useRef(-1);
  useEffect(() => {
    if (!repeat) {
      repeatIndex.current = -1;
      return;
    }
    if (activeIndex >= 0) repeatIndex.current = activeIndex;

    const locked = ordered[repeatIndex.current];
    if (locked && engine.currentTime >= locked.end) seek(locked.start + 0.01);
  }, [activeIndex, engine.currentTime, ordered, repeat, seek]);

  // میان‌برهای صفحه‌کلید؛ وقتی تمرکز روی یک ورودی است، دخالت نمی‌کنیم.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          engine.toggle();
          break;
        // در چیدمان راست‌به‌چپ، پیکان چپ یعنی «جلو».
        case "ArrowLeft":
          event.preventDefault();
          engine.nudge(5);
          break;
        case "ArrowRight":
          event.preventDefault();
          engine.nudge(-5);
          break;
        case "ArrowDown":
          event.preventDefault();
          nextVerse();
          break;
        case "ArrowUp":
          event.preventDefault();
          prevVerse();
          break;
        case "m":
        case "M":
          engine.toggleMute();
          break;
        case "r":
        case "R":
          setRepeat((v) => !v);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, nextVerse, prevVerse]);

  // اطلاعات اثر روی صفحه‌ی قفل گوشی و کنترل‌های سیستمی.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: piece.title,
      artist: piece.poet || "شهریار",
      album: form,
    });
    session.setActionHandler("play", () => engine.play());
    session.setActionHandler("pause", () => engine.pause());
    session.setActionHandler("previoustrack", prevVerse);
    session.setActionHandler("nexttrack", nextVerse);
    session.setActionHandler("seekbackward", () => engine.nudge(-5));
    session.setActionHandler("seekforward", () => engine.nudge(5));

    return () => {
      session.setActionHandler("play", null);
      session.setActionHandler("pause", null);
      session.setActionHandler("previoustrack", null);
      session.setActionHandler("nexttrack", null);
      session.setActionHandler("seekbackward", null);
      session.setActionHandler("seekforward", null);
    };
  }, [engine, form, nextVerse, piece.poet, piece.title, prevVerse]);

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

  const hasSegments = ordered.length > 0;

  return (
    <div
      data-accent={piece.accent}
      className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-5 pb-44 pt-8"
    >
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
            aria-pressed={autoScroll}
            className="btn btn-ghost !py-1.5 !text-xs"
          >
            پیمایش خودکار: {autoScroll ? "روشن" : "خاموش"}
          </button>
          {hasSegments && (
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
        className="mt-6 max-h-[56dvh] flex-1"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-5 py-3">
          <AudioPlayer
            engine={engine}
            segments={ordered}
            compact
            onPrevVerse={hasSegments ? prevVerse : undefined}
            onNextVerse={hasSegments ? nextVerse : undefined}
            repeat={hasSegments ? repeat : undefined}
            onToggleRepeat={hasSegments ? () => setRepeat((v) => !v) : undefined}
          />

          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-paper-faint">
            <span>{toPersianDigits(ordered.length)} سطرِ هم‌زمان</span>
            <span className="hidden sm:inline">
              <span className="kbd">فاصله</span> پخش · <span className="kbd">↑</span>
              <span className="kbd">↓</span> بیت · <span className="kbd">R</span> تکرار
            </span>
            <span className="sm:hidden">برای رفتن به هر مصرع، روی آن بزنید</span>
          </div>
        </div>
      </div>
    </div>
  );
}
