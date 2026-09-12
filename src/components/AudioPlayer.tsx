"use client";

import { useCallback, useRef, useState } from "react";
import type { Segment } from "@/lib/types";
import { formatTimeFa } from "@/lib/time";
import type { AudioEngine } from "./useAudioEngine";

const RATES = [0.75, 1, 1.25, 1.5];

interface Props {
  engine: AudioEngine;
  /** برای رسم نشانه‌ی سطرهای زمان‌بندی‌شده روی نوار. */
  segments?: Segment[];
  compact?: boolean;
  onPrevVerse?: () => void;
  onNextVerse?: () => void;
  /** تکرار بیتِ در حال خواندن. */
  repeat?: boolean;
  onToggleRepeat?: () => void;
}

export function AudioPlayer({
  engine,
  segments = [],
  compact = false,
  onPrevVerse,
  onNextVerse,
  repeat,
  onToggleRepeat,
}: Props) {
  const { currentTime, duration, playing, ready, error, rate, buffered, volume, muted } = engine;
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ ratio: number; time: number } | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  /** چرخش میان سرعت‌های پخش؛ برای دکمه‌ی جمع‌وجورِ موبایل. */
  const cycleRate = () => {
    const index = RATES.indexOf(rate);
    engine.setRate(RATES[(index + 1) % RATES.length]);
  };
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  /** چیدمان راست‌به‌چپ است، پس نسبت را از لبه‌ی راست می‌سنجیم. */
  const ratioAt = useCallback((clientX: number): number | null => {
    const bar = barRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (rect.right - clientX) / rect.width));
  }, []);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const ratio = ratioAt(clientX);
      if (ratio === null || duration <= 0) return;
      engine.seek(ratio * duration);
    },
    [duration, engine, ratioAt],
  );

  const onBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event.clientX);
  };

  const onBarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioAt(event.clientX);
    if (ratio !== null && duration > 0) setHover({ ratio, time: ratio * duration });
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
        onPointerLeave={() => setHover(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") engine.nudge(2);
          if (event.key === "ArrowRight") engine.nudge(-2);
        }}
        className="group relative h-9 cursor-pointer touch-none select-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-hair/10">
          <div
            className="absolute inset-y-0 rounded-full bg-hair/10"
            style={{ insetInlineStart: 0, width: `${bufferedPercent}%` }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 rounded-full bg-[rgb(var(--accent))]"
            style={{ insetInlineStart: 0, width: `${progress}%` }}
          />
        </div>

        {duration > 0 &&
          segments.map((seg) => (
            <span
              key={seg.id}
              className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-hair/25"
              style={{ insetInlineStart: `${(seg.start / duration) * 100}%` }}
              aria-hidden
            />
          ))}

        <span
          className="absolute top-1/2 grid h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-[rgb(var(--accent))] shadow-lg shadow-[rgb(var(--accent))]/40 transition-transform group-hover:scale-125"
          style={{ insetInlineStart: `${progress}%` }}
          aria-hidden
        />

        {hover && (
          <span
            className="pointer-events-none absolute -top-1 translate-x-1/2 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-paper shadow-lg ring-1 ring-hair/10"
            style={{ insetInlineStart: `${hover.ratio * 100}%` }}
            dir="ltr"
            aria-hidden
          >
            {formatTimeFa(hover.time)}
          </span>
        )}
      </div>

      {/*
        شبکه‌ی سه‌ستونی با ستون میانیِ خودکار: دکمه‌ی پخش دقیقاً وسط نوار
        می‌نشیند، مستقل از اینکه دو طرفش چند کنترل باشد. با justify-between
        جای دکمه به تعداد کنترل‌های کناری وابسته می‌شد.
        روی صفحه‌ی باریک، کنترل‌های اصلی یک ردیف جدا می‌گیرند.
      */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-3">
        {/*
          گروه اصلی عمداً چپ‌به‌راست است: «بیت بعدی» سمت راستِ دکمه‌ی پخش و
          «بیت پیشین» سمت چپ آن می‌نشیند، مثل هر پخش‌کننده‌ی دیگری. نوار
          پیشرفت هم از چپ به راست پیش می‌رود، پس جهت‌ها با هم می‌خوانند.
        */}
        <div dir="ltr" className="col-start-2 row-start-1 flex items-center gap-2 justify-self-center sm:gap-1">
          {onPrevVerse && (
            <button
              type="button"
              onClick={onPrevVerse}
              disabled={!ready}
              className="btn btn-ghost !px-1.5 sm:!px-2"
              title="بیت پیشین"
              aria-label="بیت پیشین"
            >
              <VerseArrow dir="prev" />
            </button>
          )}

          <button
            type="button"
            onClick={() => engine.nudge(-5)}
            disabled={!ready}
            className="btn btn-ghost !hidden !px-2 sm:!inline-flex sm:!px-2.5"
            title="۵ ثانیه عقب"
            aria-label="پنج ثانیه عقب"
          >
            <SkipIcon dir="back" />
          </button>

          <button
            type="button"
            onClick={engine.toggle}
            disabled={!ready}
            className="btn btn-primary !h-10 !w-10 !rounded-full !p-0 sm:!h-11 sm:!w-11"
            aria-label={playing ? "مکث" : "پخش"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            onClick={() => engine.nudge(5)}
            disabled={!ready}
            className="btn btn-ghost !hidden !px-2 sm:!inline-flex sm:!px-2.5"
            title="۵ ثانیه جلو"
            aria-label="پنج ثانیه جلو"
          >
            <SkipIcon dir="forward" />
          </button>

          {onNextVerse && (
            <button
              type="button"
              onClick={onNextVerse}
              disabled={!ready}
              className="btn btn-ghost !px-1.5 sm:!px-2"
              title="بیت بعدی"
              aria-label="بیت بعدی"
            >
              <VerseArrow dir="next" />
            </button>
          )}
        </div>

        <div className="col-start-1 row-start-1 flex items-center gap-1 justify-self-start sm:gap-2">
          {onToggleRepeat && (
            <button
              type="button"
              onClick={onToggleRepeat}
              aria-pressed={repeat}
              title="تکرار بیتِ جاری"
              aria-label="تکرار بیت جاری"
              className={`btn !px-2 sm:!px-2.5 ${repeat ? "btn-primary" : "btn-ghost"}`}
            >
              <RepeatIcon />
            </button>
          )}

          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={engine.toggleMute}
              className="btn btn-ghost !px-2"
              aria-label={muted ? "باصدا کردن" : "بی‌صدا کردن"}
              title={muted ? "باصدا" : "بی‌صدا"}
            >
              <VolumeIcon level={muted ? 0 : volume} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => engine.setVolume(Number(event.target.value))}
              aria-label="بلندی صدا"
              className="range-slim w-20"
            />
          </div>
        </div>

        <div className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end sm:gap-3">
          {/*
            نوار کامل سرعت روی موبایل جا نمی‌شود و نوار پخش را دو ردیفه می‌کرد،
            پس آنجا به یک دکمه‌ی چرخشی جمع می‌شود؛ خودِ قابلیت از دست نمی‌رود.
          */}
          <button
            type="button"
            onClick={cycleRate}
            title="سرعت پخش"
            aria-label={`سرعت پخش: ${toFa(rate)} برابر`}
            className="btn btn-ghost !px-2 font-mono !text-[11px] tabular-nums sm:hidden"
          >
            {toFa(rate)}×
          </button>

          <div className="hidden items-center gap-0.5 rounded-xl bg-hair/5 p-0.5 sm:flex">
            {RATES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => engine.setRate(value)}
                className={`rounded-lg px-1.5 py-1 text-[11px] transition ${
                  rate === value
                    ? "bg-[rgb(var(--accent))] font-semibold text-on-accent"
                    : "text-paper-dim hover:text-paper"
                }`}
              >
                {toFa(value)}×
              </button>
            ))}
          </div>

          <p className="hidden font-mono tabular-nums text-paper-dim sm:block sm:text-xs" dir="ltr">
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
  return String(value)
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
    .replace(".", "٫");
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

/** پیکان پرش بین ابیات؛ در چیدمان راست‌به‌چپ، «بعدی» به سمت چپ است. */
function VerseArrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ transform: dir === "next" ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9a4 4 0 0 1 4-4h8l-2.5-2.5M20 15a4 4 0 0 1-4 4H8l2.5 2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VolumeIcon({ level }: { level: number }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {level > 0.02 && (
        <path d="M15.6 9.6a3.4 3.4 0 0 1 0 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
      {level > 0.5 && (
        <path d="M18.2 7a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
      {level <= 0.02 && (
        <path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}
