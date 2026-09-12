"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearTiming,
  draftFromText,
  draftId,
  draftIssues,
  draftToText,
  isTimed,
  lowerBound,
  setEnd,
  setStart,
  suggestStart,
  timedCount,
  type DraftSegment,
} from "@/lib/draft";
import { formatTime, formatTimeFa, toPersianDigits } from "@/lib/time";
import type { AudioEngine } from "./useAudioEngine";
import { TimeField } from "./TimeField";

interface Props {
  draft: DraftSegment[];
  onChange: (next: DraftSegment[]) => void;
  engine: AudioEngine;
}

/**
 * ویرایشگر زمان‌بندی.
 * قاعده‌ی بنیادی: مرز میان دو سطر یک عدد مشترک است. با ثبت پایانِ یک سطر،
 * همان لحظه شروعِ سطر بعدی می‌شود، پس تداخل اصلاً نمی‌تواند رخ دهد.
 */
export function SyncEditor({ draft, onChange, engine }: Props) {
  const { currentTime, duration } = engine;
  const [cursor, setCursor] = useState(0);
  const [showText, setShowText] = useState(false);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  // وقتی «پیش‌نمایش سطر» می‌زنیم، در این زمان باید پخش متوقف شود.
  const previewStop = useRef<number | null>(null);

  const issues = useMemo(() => draftIssues(draft, duration), [draft, duration]);
  const done = timedCount(draft);

  const activeIndex = useMemo(() => {
    for (let i = 0; i < draft.length; i++) {
      const seg = draft[i];
      if (seg.start !== null && seg.end !== null && currentTime >= seg.start && currentTime < seg.end) {
        return i;
      }
    }
    return -1;
  }, [draft, currentTime]);

  // توقف خودکار در پایان سطری که پیش‌نمایشش را خواسته‌ایم.
  useEffect(() => {
    const stop = previewStop.current;
    if (stop !== null && currentTime >= stop) {
      previewStop.current = null;
      engine.pause();
    }
  }, [currentTime, engine]);

  const focusRow = useCallback((index: number) => {
    rowRefs.current[index]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  /** ثبت مرز: پایانِ سطرِ جاری = اکنون، و همان لحظه شروعِ سطر بعدی. */
  const markBoundary = useCallback(() => {
    if (cursor >= draft.length) return;
    const next = setEnd(draft, cursor, currentTime);
    onChange(next);
    const advance = Math.min(cursor + 1, draft.length - 1);
    setCursor(advance);
    focusRow(advance);
  }, [cursor, draft, currentTime, onChange, focusRow]);

  /** آغاز سطر جاری از لحظه‌ی کنونی. برای نخستین سطر یا پس از یک سکوت. */
  const markStart = useCallback(() => {
    if (cursor >= draft.length) return;
    onChange(setStart(draft, cursor, currentTime));
  }, [cursor, draft, currentTime, onChange]);

  // میان‌برهای صفحه‌کلید؛ وقتی کاربر داخل یک ورودی است غیرفعال‌اند.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.code) {
        case "Space":
          event.preventDefault();
          engine.toggle();
          break;
        case "Enter":
          event.preventDefault();
          markBoundary();
          break;
        case "KeyS":
          event.preventDefault();
          markStart();
          break;
        case "ArrowRight":
          event.preventDefault();
          engine.nudge(-2);
          break;
        case "ArrowLeft":
          event.preventDefault();
          engine.nudge(2);
          break;
        case "ArrowDown":
          event.preventDefault();
          setCursor((c) => Math.min(c + 1, draft.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine, markBoundary, markStart, draft.length]);

  const previewRow = (index: number) => {
    const seg = draft[index];
    if (seg.start === null) return;
    previewStop.current = seg.end;
    engine.seek(seg.start);
    engine.play();
  };

  const updateRow = (index: number, patch: Partial<DraftSegment>) => {
    onChange(draft.map((seg, i) => (i === index ? { ...seg, ...patch } : seg)));
  };

  const removeRow = (index: number) => {
    onChange(draft.filter((_, i) => i !== index));
    setCursor((c) => Math.max(0, Math.min(c, draft.length - 2)));
  };

  const addRowAfter = (index: number) => {
    const copy = [...draft];
    copy.splice(index + 1, 0, {
      id: draftId(),
      text: "",
      start: null,
      end: null,
      group: draft[index]?.group ?? 0,
    });
    onChange(copy);
    setCursor(index + 1);
  };

  return (
    <div className="space-y-4">
      <div className="glass sticky top-16 z-30 rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={engine.toggle} className="btn btn-primary !h-10 !w-10 !rounded-full !p-0">
              {engine.playing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.1-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" /></svg>
              )}
            </button>
            <span className="font-mono text-sm tabular-nums text-paper" dir="ltr">
              {formatTimeFa(currentTime, true)}
            </span>
            <span className="text-xs text-paper-faint">
              از {formatTimeFa(duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={markStart} className="btn btn-ghost !py-1.5 !text-xs" disabled={!engine.ready}>
              شروع سطر «S»
            </button>
            <button type="button" onClick={markBoundary} className="btn btn-primary !py-1.5 !text-xs" disabled={!engine.ready}>
              ثبت پایان و رفتن به بعدی «Enter»
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-hair/10">
            <div
              className="h-full rounded-full bg-[rgb(var(--accent))] transition-[width]"
              style={{ width: draft.length ? `${(done / draft.length) * 100}%` : "0%" }}
            />
          </div>
          <p className="text-[11px] text-paper-dim">
            {toPersianDigits(done)} از {toPersianDigits(draft.length)} سطر زمان‌بندی شد
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-paper-faint">
          سطر انتخاب‌شده با فلش بالا/پایین جابه‌جا می‌شود. برای بیت دو‌مصرعی، دو مصرع را با «|» جدا کنید.
        </p>
        <button type="button" onClick={() => setShowText((v) => !v)} className="btn btn-ghost !py-1.5 !text-xs">
          {showText ? "بستن ویرایش متن" : "ویرایش یک‌جای متن"}
        </button>
      </div>

      {showText && <BulkTextPanel draft={draft} onChange={onChange} onClose={() => setShowText(false)} />}

      <ul className="space-y-2">
        {draft.map((seg, index) => {
          const issue = issues.get(seg.id);
          const selected = index === cursor;
          const playing = index === activeIndex;

          return (
            <li
              key={seg.id}
              ref={(node) => {
                rowRefs.current[index] = node;
              }}
              onClick={() => setCursor(index)}
              className={`rounded-2xl border p-3 transition ${
                selected
                  ? "border-[rgb(var(--accent))]/50 bg-[rgb(var(--accent))]/[0.07]"
                  : playing
                    ? "border-hair/15 bg-hair/[0.05]"
                    : "border-hair/[0.07] bg-hair/[0.02]"
              } ${issue ? "!border-red-400/40" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] tabular-nums ${
                    isTimed(seg) ? "bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent-soft))]" : "bg-hair/5 text-paper-faint"
                  }`}
                >
                  {toPersianDigits(index + 1)}
                </span>

                <div className="min-w-0 flex-1 space-y-2">
                  <textarea
                    rows={1}
                    value={seg.text}
                    onChange={(event) => updateRow(index, { text: event.target.value })}
                    placeholder="متن مصرع یا بیت…"
                    className="field resize-none !py-1.5 leading-8"
                    style={{ minHeight: "2.5rem" }}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-paper-faint">از</span>
                      <div className="w-24">
                        <TimeField
                          label={`زمان شروع سطر ${index + 1}`}
                          value={seg.start}
                          invalid={Boolean(issue)}
                          onCommit={(value) =>
                            value === null
                              ? updateRow(index, { start: null, end: null })
                              : onChange(setStart(draft, index, value))
                          }
                        />
                      </div>
                      <span className="text-[11px] text-paper-faint">تا</span>
                      <div className="w-24">
                        <TimeField
                          label={`زمان پایان سطر ${index + 1}`}
                          value={seg.end}
                          invalid={Boolean(issue)}
                          onCommit={(value) =>
                            value === null
                              ? updateRow(index, { end: null })
                              : onChange(setEnd(draft, index, value))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <RowButton
                        onClick={() => onChange(setStart(draft, index, currentTime))}
                        title="زمان شروع = لحظه‌ی کنونی"
                      >
                        شروع = اکنون
                      </RowButton>
                      <RowButton
                        onClick={() => onChange(setEnd(draft, index, currentTime))}
                        title="زمان پایان = لحظه‌ی کنونی (شروع سطر بعد هم همین می‌شود)"
                      >
                        پایان = اکنون
                      </RowButton>
                      <RowButton onClick={() => previewRow(index)} disabled={!isTimed(seg)} title="پخش همین سطر">
                        ▶ پیش‌نمایش
                      </RowButton>
                      <RowButton onClick={() => onChange(clearTiming(draft, index))} title="پاک‌کردن زمان‌بندی این سطر">
                        پاک‌کردن زمان
                      </RowButton>
                      <RowButton onClick={() => addRowAfter(index)} title="افزودن سطر بعد از این">
                        + سطر
                      </RowButton>
                      <RowButton onClick={() => removeRow(index)} danger title="حذف این سطر">
                        حذف
                      </RowButton>
                    </div>

                    {seg.start === null && (
                      <span className="text-[11px] text-paper-faint">
                        پیشنهاد شروع: {formatTime(suggestStart(draft, index))}
                      </span>
                    )}
                  </div>

                  {issue && <p className="text-[11px] text-red-300">{issue}</p>}
                  {!issue && seg.start !== null && seg.end !== null && (
                    <p className="text-[11px] text-paper-faint" dir="ltr">
                      {formatTime(seg.end - seg.start)} — از {formatTime(lowerBound(draft, index))}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!draft.length && (
        <p className="rounded-2xl border border-dashed border-hair/10 p-8 text-center text-sm text-paper-faint">
          هنوز متنی وارد نشده است. از «ویرایش یک‌جای متن» شعر را بچسبانید.
        </p>
      )}
    </div>
  );
}

function RowButton({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`rounded-lg border px-2 py-1 text-[11px] transition disabled:opacity-35 ${
        danger
          ? "border-red-400/25 text-red-300/80 hover:bg-red-500/10"
          : "border-hair/10 text-paper-dim hover:bg-hair/10 hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * ویرایش یک‌جای متن. زمان‌بندی سطرهایی که متنشان دست‌نخورده مانده حفظ می‌شود،
 * تا اصلاح یک غلط املایی کل کار زمان‌بندی را از بین نبرد.
 */
function BulkTextPanel({
  draft,
  onChange,
  onClose,
}: {
  draft: DraftSegment[];
  onChange: (next: DraftSegment[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(() => draftToText(draft));

  const apply = () => {
    const fresh = draftFromText(text);
    const byText = new Map<string, DraftSegment[]>();
    for (const seg of draft) {
      if (!isTimed(seg)) continue;
      const key = seg.text.trim();
      const bucket = byText.get(key);
      if (bucket) bucket.push(seg);
      else byText.set(key, [seg]);
    }

    const merged = fresh.map((seg) => {
      const bucket = byText.get(seg.text.trim());
      const match = bucket?.shift();
      return match ? { ...seg, start: match.start, end: match.end } : seg;
    });

    onChange(merged);
    onClose();
  };

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <p className="text-xs text-paper-dim">
        هر سطر یک مصرع است. یک خط خالی، مرز بند یا بیت بعدی را مشخص می‌کند.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={12}
        dir="rtl"
        className="field scrollbar-slim resize-y leading-9"
        placeholder={"الا یا ایها الساقی ادر کأسا و ناولها\nکه عشق آسان نمود اول ولی افتاد مشکل‌ها"}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost">
          انصراف
        </button>
        <button type="button" onClick={apply} className="btn btn-primary">
          اعمال متن
        </button>
      </div>
    </div>
  );
}
