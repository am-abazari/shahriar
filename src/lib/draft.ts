import type { Segment } from "./types";
import { MIN_SEGMENT_LENGTH, parseLyricsText } from "./segments";
import { roundTime } from "./time";

/**
 * شکلِ سطر در حال ویرایش.
 * برخلاف Segment، اینجا زمان می‌تواند null باشد؛ یعنی «هنوز تعیین نشده».
 * این تمایز لازم است چون ۰ خودش یک زمان معتبر برای اولین مصرع است.
 */
export interface DraftSegment {
  id: string;
  text: string;
  start: number | null;
  end: number | null;
  group: number;
}

let counter = 0;
export function draftId(): string {
  counter += 1;
  return `d${Date.now().toString(36)}${counter.toString(36)}`;
}

export function draftFromText(raw: string): DraftSegment[] {
  return parseLyricsText(raw).map(({ text, group }) => ({
    id: draftId(),
    text,
    start: null,
    end: null,
    group,
  }));
}

export function draftFromSegments(segments: Segment[]): DraftSegment[] {
  return segments.map((s) => ({ ...s }));
}

export function draftToText(draft: DraftSegment[]): string {
  let out = "";
  let group = draft[0]?.group ?? 0;
  draft.forEach((seg, i) => {
    if (i > 0 && seg.group !== group) out += "\n";
    group = seg.group;
    out += `${seg.text}\n`;
  });
  return out.trimEnd();
}

/** فقط سطرهایی که هر دو زمانشان مشخص است به مدل نهایی تبدیل می‌شوند. */
export function draftToSegments(draft: DraftSegment[]): Segment[] {
  return draft
    .filter((s) => s.start !== null && s.end !== null && s.end > s.start && s.text.trim())
    .map((s) => ({
      id: s.id,
      text: s.text.trim(),
      start: roundTime(s.start as number),
      end: roundTime(s.end as number),
      group: s.group,
    }));
}

export function isTimed(seg: DraftSegment): boolean {
  return seg.start !== null && seg.end !== null && seg.end > seg.start;
}

export function timedCount(draft: DraftSegment[]): number {
  return draft.filter(isTimed).length;
}

/**
 * زمان شروعِ پیشنهادی برای سطر index: پایانِ آخرین سطرِ زمان‌خورده‌ی پیش از آن.
 * اگر سطر بلافاصله قبلی هنوز زمان نخورده باشد، عقب‌تر را نگاه می‌کند.
 */
export function suggestStart(draft: DraftSegment[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    const end = draft[i]?.end;
    if (end !== null && end !== undefined) return roundTime(end);
  }
  return 0;
}

/** بیشترین زمانی که سطر index مجاز است از آن عقب‌تر نرود. */
export function lowerBound(draft: DraftSegment[], index: number): number {
  return suggestStart(draft, index);
}

/** کمترین زمانی که سطر index مجاز است از آن جلوتر نرود (شروعِ نخستین سطر زمان‌خورده‌ی بعدی). */
export function upperBound(draft: DraftSegment[], index: number): number | null {
  for (let i = index + 1; i < draft.length; i++) {
    const start = draft[i]?.start;
    if (start !== null && start !== undefined) return roundTime(start);
  }
  return null;
}

export function setStart(draft: DraftSegment[], index: number, value: number): DraftSegment[] {
  const floor = lowerBound(draft, index);
  const start = roundTime(Math.max(floor, value));
  return draft.map((seg, i) => {
    if (i !== index) return seg;
    // اگر پایانِ فعلی دیگر بعد از شروع نیست، آن را پاک می‌کنیم تا کاربر دوباره ثبتش کند.
    const end = seg.end !== null && seg.end > start ? seg.end : null;
    return { ...seg, start, end };
  });
}

/**
 * ثبت زمان پایان سطر و انتقال خودکار همان زمان به شروعِ سطر بعدی.
 * این همان قاعده‌ای است که تداخل بین بیت‌ها را از ریشه غیرممکن می‌کند:
 * مرزِ مشترکِ دو سطر یک عدد است، نه دو عدد مستقل.
 */
export function setEnd(draft: DraftSegment[], index: number, value: number): DraftSegment[] {
  const current = draft[index];
  if (!current) return draft;

  const floor = (current.start ?? lowerBound(draft, index)) + MIN_SEGMENT_LENGTH;
  const end = roundTime(Math.max(floor, value));

  return draft.map((seg, i) => {
    if (i === index) {
      return { ...seg, start: seg.start ?? lowerBound(draft, index), end };
    }
    if (i === index + 1) {
      // سطر بعدی از همین‌جا آغاز می‌شود، مگر آنکه قبلاً دستی جلوتر تنظیم شده باشد.
      if (seg.start === null || seg.start < end) {
        const nextEnd = seg.end !== null && seg.end > end ? seg.end : null;
        return { ...seg, start: end, end: nextEnd };
      }
    }
    return seg;
  });
}

/** پاک‌کردن زمان‌بندی یک سطر بدون دست‌زدن به متن آن. */
export function clearTiming(draft: DraftSegment[], index: number): DraftSegment[] {
  return draft.map((seg, i) => (i === index ? { ...seg, start: null, end: null } : seg));
}

export interface DraftIssue {
  id: string;
  message: string;
}

/** خطاهای زمان‌بندی؛ کلید، شناسه‌ی سطر است تا مستقیم کنار همان سطر نشان داده شود. */
export function draftIssues(draft: DraftSegment[], duration: number): Map<string, string> {
  const issues = new Map<string, string>();

  draft.forEach((seg, i) => {
    if (!seg.text.trim()) {
      issues.set(seg.id, "متن این سطر خالی است.");
      return;
    }
    if (seg.start === null && seg.end === null) return;
    if (seg.start === null || seg.end === null) {
      issues.set(seg.id, "زمان‌بندی این سطر ناقص است.");
      return;
    }
    if (seg.end <= seg.start) {
      issues.set(seg.id, "زمان پایان باید بعد از زمان شروع باشد.");
      return;
    }
    if (duration > 0 && seg.end > duration + 0.5) {
      issues.set(seg.id, "زمان پایان از مدت فایل صوتی بیشتر است.");
      return;
    }
    // تداخل با نخستین سطر زمان‌خورده‌ی بعدی.
    for (let j = i + 1; j < draft.length; j++) {
      const next = draft[j];
      if (next.start === null) continue;
      if (seg.end > next.start + 1e-6) {
        issues.set(seg.id, "این سطر با سطر بعدی تداخل زمانی دارد.");
      }
      break;
    }
  });

  return issues;
}
