"use client";

import { useCallback, useRef } from "react";
import type { Segment } from "@/lib/types";
import { formatTimeFa } from "@/lib/time";
import type { AudioEngine } from "./useAudioEngine";

const RATES = [0.75, 1, 1.25, 1.5];

interface Props {
  engine: AudioEngine;
  /** برای رسم نشانه‌ی سطرهای زمان‌بندی‌شده روی نوار. */
  segments?: Segment[];
  compact?: boolean;
}

export function AudioPlayer({ engine, segments = [], compact = false }: Props) {
  const { currentTime, duration, playing, ready, error, rate } = engine;
  const barRef = useRef<HTMLDivElement | null>(null);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      // چیدمان راست‌به‌چپ است، پس فاصله را از لبه‌ی راست می‌سنجیم.
      const ratio = (rect.right - clientX) / rect.width;
      engine.seek(Math.min(1, Math.max(0, ratio)) * duration);
    },
    [duration, engine],
  );

  const onBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event.clientX);
  };

  const onBarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons === 1) seekFromPointer(event.clientX);
  };

  return (
    <div className={compact ? "" : "glass rounded-3xl p-4 sm:p-5"}>
      {error && (
        <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="نوار زمان"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTimeFa(currentTime)} از ${formatTimeFa(duration)}`}
        onPointerDown={onBarPointerDown}
        onPointerMove={onBarPointerMove}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") engine.nudge(2);
          if (event.key === "ArrowRight") engine.nudge(-2);
        }}
        className="group relative h-10 cursor-pointer touch-none select-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[rgb(var(--accent))] transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {duration > 0 &&
          segments.map((seg) => (
            <span
              key={seg.id}
              className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/25"
              style={{ insetInlineStart: `${(seg.start / duration) * 100}%` }}
              aria-hidden
            />
          ))}

        <span
          className="absolute top-1/2 grid h-4 w-4 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-[rgb(var(--accent))] shadow-lg shadow-[rgb(var(--accent))]/40 transition-transform group-hover:scale-125"
          style={{ insetInlineStart: `${progress}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => engine.nudge(-5)}
            disabled={!ready}
            className="btn btn-ghost !px-2.5"
            title="۵ ثانیه عقب"
            aria-label="پنج ثانیه عقب"
          >
            <SkipIcon dir="back" />
          </button>

          <button
            type="button"
            onClick={engine.toggle}
            disabled={!ready}
            className="btn btn-primary !h-11 !w-11 !rounded-full !p-0"
            aria-label={playing ? "مکث" : "پخش"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            onClick={() => engine.nudge(5)}
            disabled={!ready}
            className="btn btn-ghost !px-2.5"
            title="۵ ثانیه جلو"
            aria-label="پنج ثانیه جلو"
          >
            <SkipIcon dir="forward" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5">
            {RATES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => engine.setRate(value)}
                className={`rounded-lg px-2 py-1 text-[11px] transition ${
                  rate === value
                    ? "bg-[rgb(var(--accent))] text-ink-950 font-semibold"
                    : "text-paper-dim hover:text-paper"
                }`}
              >
                {toFa(value)}×
              </button>
            ))}
          </div>

          <p className="font-mono text-xs tabular-nums text-paper-dim" dir="ltr">
            <span className="text-paper">{formatTimeFa(currentTime)}</span>
            <span className="mx-1 opacity-40">/</span>
            <span>{formatTimeFa(duration)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function toFa(value: number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]).replace(".", "٫");
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.1-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" />
    </svg>
  );
}

function SkipIcon({ dir }: { dir: "back" | "forward" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ transform: dir === "forward" ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M11 6 5 12l6 6M19 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
