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
  /** شماره‌ی بیتی که تکرار می‌شود؛ ‎-۱ یعنی تکرار خاموش است. */
  const [repeatIndex, setRepeatIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const repeat = repeatIndex >= 0;

  // ارتفاع نوار پخش اندازه گرفته می‌شود، نه حدس زده: روی صفحه‌ی باریک
  // کنترل‌ها در چند ردیف می‌شکنند و نوار بلندتر می‌شود.
  const barRef = useRef<HTMLDivElement | null>(null);
  const [barHeight, setBarHeight] = useState(92);

  useEffect(() => {
    const node = barRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setBarHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const form = PIECE_FORMS.find((f) => f.value === piece.form)?.label ?? "شعر";
  const ordered = useMemo(() => sortSegments(piece.segments), [piece.segments]);
  const activeIndex = findActiveIndex(ordered, engine.currentTime);

  const { seek } = engine;

  /** پرش به سطر شماره‌ی index؛ کمی جلوتر از مرز تا خودِ سطر فعال شود. */
  const goToVerse = useCallback(
    (index: number) => {
      const target = ordered[index];
      if (!target) return;
      seek(target.start + 0.01);
      // اگر تکرار روشن است، قفل روی همان بیتی می‌رود که کاربر انتخاب کرد.
      setRepeatIndex((current) => (current >= 0 ? index : current));
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

  // تکرار بیت: وقتی زمان از پایان بیتِ قفل‌شده رد شد، به ابتدای همان بیت برمی‌گردیم.
  // قفل عمداً با جلو رفتن زمان جابه‌جا نمی‌شود، وگرنه تکرار هرگز رخ نمی‌داد.
  useEffect(() => {
    if (repeatIndex < 0) return;
    const locked = ordered[repeatIndex];
    if (locked && engine.currentTime >= locked.end) seek(locked.start + 0.01);
  }, [engine.currentTime, ordered, repeatIndex, seek]);

  /**
   * روشن و خاموش کردن تکرار.
   * هنگام روشن‌شدن، روی بیتِ در حال خواندن قفل می‌شود؛ اگر در فاصله‌ی میان دو
   * بیت باشیم، روی نزدیک‌ترین بیتِ پیشِ‌رو.
   */
  const toggleRepeat = useCallback(() => {
    setRepeatIndex((current) => {
      if (current >= 0) return -1;
      const active = findActiveIndex(ordered, engine.currentTime);
      if (active >= 0) return active;
      const upcoming = ordered.findIndex((s) => s.start > engine.currentTime);
      return upcoming >= 0 ? upcoming : ordered.length - 1;
    });
  }, [engine.currentTime, ordered]);

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
          toggleRepeat();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, nextVerse, prevVerse, toggleRepeat]);

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
      className="flex min-h-[calc(100dvh-4rem)] w-full flex-col"
    >
      <audio ref={engine.audioRef} src={piece.audioUrl} preload="metadata" crossOrigin="anonymous" />

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-5">
        {/* سرصفحه عمداً کم‌ارتفاع است؛ آنچه باید دیده شود، خودِ شعر است. */}
        <header className="pt-6 text-center">
          <h1 className="text-balance text-lg font-bold leading-relaxed sm:text-xl">
            {piece.title}
          </h1>
          <p className="mt-1.5 text-xs text-paper-dim">
            {piece.poet && <span>{piece.poet}</span>}
            {piece.poet && <span className="mx-1.5 opacity-40">·</span>}
            <span className="text-paper-faint">{form}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="text-paper-faint">{toPersianDigits(ordered.length)} سطر</span>
          </p>

          {piece.note && (
            <p className="mx-auto mt-2.5 max-w-lg text-balance text-[11px] leading-6 text-paper-faint">
              {piece.note}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              aria-pressed={autoScroll}
              title="پیمایش خودکار تا مصرعِ در حال خواندن"
              className={`btn !px-2.5 !py-1 !text-[11px] ${autoScroll ? "btn-primary" : "btn-ghost"}`}
            >
              <ScrollIcon />
              پیمایش خودکار
            </button>
            {hasSegments && (
              <button
                type="button"
                onClick={downloadLrc}
                title="دریافت زمان‌بندی به قالب LRC"
                className="btn btn-ghost !px-2.5 !py-1 !text-[11px]"
              >
                LRC
              </button>
            )}
            {admin && (
              <Link href={`/p/${piece.id}/edit`} className="btn btn-ghost !px-2.5 !py-1 !text-[11px]">
                ویرایش
              </Link>
            )}
            {admin && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="btn btn-danger !px-2.5 !py-1 !text-[11px]"
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
          bottomInset={barHeight}
          className="mt-7"
          /*
            فضای خالیِ انتهای متن، به‌اندازه‌ی نوار پخش به‌علاوه‌ی کمی بیشتر.
            بدون آن، سند آن‌قدر بلند نیست که بیت‌های پایانی از زیر نوار بالا
            بیایند و آخرین بیت پشت آن پنهان می‌ماند.
          */
          style={{ paddingBottom: barHeight + 96 }}
        />
      </div>

      {/*
        نوار پخش تمام‌عرض و «چسبان» است: هنگام پیمایش پایین صفحه می‌ماند و در
        انتهای شعر سر جای طبیعی خودش می‌نشیند.
      */}
      <div
        ref={barRef}
        className="sticky bottom-0 z-30 w-full border-t border-hair/5 bg-bg/85 backdrop-blur-xl"
        title="فاصله: پخش · بالا/پایین: بیت · چپ/راست: پنج ثانیه · R: تکرار بیت · M: بی‌صدا"
      >
        <div className="w-full px-4 py-2.5 sm:px-6">
          <AudioPlayer
            engine={engine}
            segments={ordered}
            compact
            onPrevVerse={hasSegments ? prevVerse : undefined}
            onNextVerse={hasSegments ? nextVerse : undefined}
            repeat={hasSegments ? repeat : undefined}
            onToggleRepeat={hasSegments ? toggleRepeat : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function ScrollIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v14m0 0-4.5-4.5M12 18l4.5-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
