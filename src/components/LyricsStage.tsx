"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Segment } from "@/lib/types";
import { findActiveIndex, segmentProgress, sortSegments } from "@/lib/segments";

interface Props {
  segments: Segment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  /** پیمایش خودکار تا مصرعِ در حال خواندن همیشه دیده شود. */
  autoScroll?: boolean;
  /** ارتفاع نوار پخشِ چسبیده به پایین، تا مصرع فعال زیر آن پنهان نشود. */
  bottomInset?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function LyricsStage({
  segments,
  currentTime,
  onSeek,
  autoScroll = true,
  bottomInset = 0,
  className = "",
  style,
}: Props) {
  const ordered = useMemo(() => sortSegments(segments), [segments]);
  const activeIndex = useMemo(() => findActiveIndex(ordered, currentTime), [ordered, currentTime]);

  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // پس از پیمایش دستیِ کاربر، چند ثانیه دست نگه می‌داریم تا صفحه از زیر دستش نپرد.
  const manualUntil = useRef(0);

  // پیمایش روی خودِ صفحه انجام می‌شود، نه در یک قاب داخلی؛ یک نوار پیمایش،
  // یک جهتِ حرکت، و فوتر همچنان در انتهای صفحه در دسترس می‌ماند.
  useEffect(() => {
    if (!autoScroll || activeIndex < 0) return;
    if (Date.now() < manualUntil.current) return;

    const line = lineRefs.current[activeIndex];
    if (!line) return;

    const rect = line.getBoundingClientRect();
    const visibleHeight = window.innerHeight - bottomInset;
    const target = window.scrollY + rect.top - (visibleHeight - rect.height) / 2;

    window.scrollTo({
      top: Math.max(0, target),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [activeIndex, autoScroll, bottomInset]);

  // دست‌درازیِ کاربر به نوار پیمایش، پیمایش خودکار را موقتاً کنار می‌گذارد.
  useEffect(() => {
    const pause = () => {
      manualUntil.current = Date.now() + 4000;
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("touchmove", pause, { passive: true });
    return () => {
      window.removeEventListener("wheel", pause);
      window.removeEventListener("touchmove", pause);
    };
  }, []);

  const groups = useMemo(() => groupSegments(ordered), [ordered]);

  if (!ordered.length) {
    return (
      <div className={`grid place-items-center py-24 text-center ${className}`} style={style}>
        <p className="text-sm text-paper-faint">هنوز برای این اثر سطری زمان‌بندی نشده است.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-7 ${className}`} style={style}>
      {groups.map((group, gi) => (
        <div key={gi} className="space-y-2">
          {group.map(({ segment, index }) => (
            <VerseLine
              key={segment.id}
              ref={(node) => {
                lineRefs.current[index] = node;
              }}
              segment={segment}
              state={index === activeIndex ? "active" : index < activeIndex ? "past" : "future"}
              fill={index === activeIndex ? segmentProgress(segment, currentTime) : 0}
              onClick={() => onSeek(segment.start + 0.01)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type VerseState = "active" | "past" | "future";

function VerseLine({
  ref,
  segment,
  state,
  fill,
  onClick,
}: {
  ref: (node: HTMLButtonElement | null) => void;
  segment: Segment;
  state: VerseState;
  fill: number;
  onClick: () => void;
}) {
  // «|» مرز دو مصرع یک بیت است؛ آن‌ها را کنار هم اما با فاصله می‌چینیم.
  const mesras = segment.text.split("|").map((part) => part.trim()).filter(Boolean);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={state === "active" ? "true" : undefined}
      className={`verse block w-full max-w-full text-balance rounded-2xl px-2 py-1.5 text-center leading-[2.1] outline-none transition focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))]/50 sm:px-3 ${
        state === "active" ? "verse-active" : state === "past" ? "verse-past" : ""
      }`}
      style={state === "active" ? ({ "--fill": `${fill * 100}%` } as React.CSSProperties) : undefined}
    >
      {/*
        هر مصرع روی خط خودش می‌نشیند و همه‌ی بیت‌ها یک‌جور می‌شکنند.
        چیدمان دوستونی در عمل مصرع‌های بلند را وسط کلمه می‌شکست.
      */}
      <span
        className={`grid gap-y-0.5 text-lg leading-[2] sm:text-xl md:text-2xl ${
          state === "active" ? "verse-fill font-semibold" : ""
        }`}
      >
        {mesras.map((mesra, i) => (
          <span key={i} className="min-w-0 text-balance">
            {mesra}
          </span>
        ))}
      </span>
    </button>
  );
}

/**
 * سطرها را بر پایه‌ی شماره‌ی بند دسته‌بندی می‌کند تا بندها فاصله بگیرند.
 * از Map استفاده می‌کنیم چون شماره‌ی بند در داده‌ی ویرایش‌شده ممکن است پیوسته نباشد.
 */
function groupSegments(segments: Segment[]) {
  const groups = new Map<number, { segment: Segment; index: number }[]>();
  segments.forEach((segment, index) => {
    const bucket = groups.get(segment.group);
    if (bucket) bucket.push({ segment, index });
    else groups.set(segment.group, [{ segment, index }]);
  });
  return [...groups.values()];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface MiniProps {
  segments: Segment[];
  currentTime: number;
}

/** نمایش تک‌سطریِ «الان چه می‌خواند» برای نوار پخشِ فشرده. */
export function NowReading({ segments, currentTime }: MiniProps) {
  const ordered = useMemo(() => sortSegments(segments), [segments]);
  const index = findActiveIndex(ordered, currentTime);
  if (index < 0) return null;
  return (
    <p className="truncate text-sm text-[rgb(var(--accent-soft))]">
      {ordered[index].text.replace(/\s*\|\s*/g, " ⁙ ")}
    </p>
  );
}
