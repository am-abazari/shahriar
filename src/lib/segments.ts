import type { Segment } from "./types";
import { roundTime } from "./time";

/** کوچک‌ترین طول مجاز برای یک قطعه (ثانیه). */
export const MIN_SEGMENT_LENGTH = 0.15;

export interface SegmentIssue {
  index: number;
  segmentId: string;
  message: string;
}

/**
 * قطعات را بر اساس زمان شروع مرتب می‌کند و شماره‌ی گروه را دست نمی‌زند.
 * مرتب‌سازی پایدار است تا ترتیب مصرع‌های هم‌زمان به هم نریزد.
 */
export function sortSegments(segments: Segment[]): Segment[] {
  return [...segments]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.start - b.s.start || a.i - b.i)
    .map(({ s }) => s);
}

/**
 * اعتبارسنجی کامل: هیچ قطعه‌ای نباید با قطعه‌ی بعدی تداخل داشته باشد،
 * پایان هر قطعه باید بعد از شروع آن باشد و همه در بازه‌ی [0, duration] بمانند.
 */
export function validateSegments(segments: Segment[], duration?: number): SegmentIssue[] {
  const issues: SegmentIssue[] = [];
  const ordered = sortSegments(segments);

  ordered.forEach((seg, index) => {
    if (!seg.text.trim()) {
      issues.push({ index, segmentId: seg.id, message: "متن این سطر خالی است." });
    }
    if (!Number.isFinite(seg.start) || seg.start < 0) {
      issues.push({ index, segmentId: seg.id, message: "زمان شروع نامعتبر است." });
    }
    if (!Number.isFinite(seg.end) || seg.end <= seg.start) {
      issues.push({ index, segmentId: seg.id, message: "زمان پایان باید بعد از زمان شروع باشد." });
    } else if (seg.end - seg.start < MIN_SEGMENT_LENGTH) {
      issues.push({ index, segmentId: seg.id, message: "طول این سطر بسیار کوتاه است." });
    }
    if (duration && seg.end > duration + 0.5) {
      issues.push({ index, segmentId: seg.id, message: "زمان پایان از مدت فایل صوتی بیشتر است." });
    }
    const next = ordered[index + 1];
    if (next && seg.end > next.start + 1e-6) {
      issues.push({
        index,
        segmentId: seg.id,
        message: "این سطر با سطر بعدی تداخل زمانی دارد.",
      });
    }
  });

  return issues;
}

/**
 * زمان شروعِ پیشنهادی برای سطر index: پایانِ آخرین سطرِ زمان‌بندی‌شده‌ی پیش از آن.
 * اگر سطر قبلی هنوز زمان نخورده باشد، به عقب‌تر نگاه می‌کند.
 */
export function suggestStart(segments: Segment[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    const prev = segments[i];
    if (prev && Number.isFinite(prev.end) && prev.end > 0) return roundTime(prev.end);
  }
  return 0;
}

/**
 * تنظیم زمان پایانِ یک سطر و انتشار خودکار آن به شروعِ سطر بعدی.
 * این تابع تضمین می‌کند که مرزها هرگز روی هم نیفتند.
 */
export function setEndAndChain(segments: Segment[], index: number, end: number): Segment[] {
  const value = roundTime(end);
  return segments.map((seg, i) => {
    if (i === index) {
      const start = Math.min(seg.start, Math.max(0, value - MIN_SEGMENT_LENGTH));
      return { ...seg, start: roundTime(start), end: value };
    }
    // سطر بعدی: اگر هنوز زمان‌بندی نشده یا شروعش عقب‌تر از پایان سطر فعلی است، هم‌تراز شود.
    if (i === index + 1 && (!seg.end || seg.start < value)) {
      const nextEnd = seg.end && seg.end > value ? seg.end : 0;
      return { ...seg, start: value, end: nextEnd };
    }
    return seg;
  });
}

/** تنظیم زمان شروع یک سطر، بدون اینکه به سطر قبلی نفوذ کند. */
export function setStartClamped(segments: Segment[], index: number, start: number): Segment[] {
  const prev = segments[index - 1];
  const floor = prev && prev.end ? prev.end : 0;
  const value = roundTime(Math.max(floor, start));
  return segments.map((seg, i) => {
    if (i !== index) return seg;
    const end = seg.end && seg.end > value ? seg.end : 0;
    return { ...seg, start: value, end };
  });
}

/**
 * شاخص قطعه‌ی فعال در زمان t.
 * جست‌وجوی دودویی، چون در هر فریمِ پخش صدا فراخوانی می‌شود.
 * قطعات باید از پیش مرتب و بدون تداخل باشند.
 */
export function findActiveIndex(segments: Segment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid];
    if (t < seg.start) {
      hi = mid - 1;
    } else if (t >= seg.end) {
      lo = mid + 1;
    } else {
      result = mid;
      break;
    }
  }
  return result;
}

/** نسبت پیشرفت داخل قطعه‌ی فعال، عددی بین ۰ و ۱. */
export function segmentProgress(segment: Segment, t: number): number {
  const span = segment.end - segment.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (t - segment.start) / span));
}

/** متن خام را به سطرها می‌شکند و بندها را با خط خالی تشخیص می‌دهد. */
export function parseLyricsText(raw: string): { text: string; group: number }[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: { text: string; group: number }[] = [];
  let group = 0;
  let sawContentInGroup = false;

  for (const line of lines) {
    const text = line.trim();
    if (!text) {
      if (sawContentInGroup) {
        group++;
        sawContentInGroup = false;
      }
      continue;
    }
    out.push({ text, group });
    sawContentInGroup = true;
  }
  return out;
}

/** خروجی گرفتن به قالب استاندارد LRC. */
export function toLrc(segments: Segment[]): string {
  const stamp = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const cs = Math.round((t - Math.floor(t)) * 100);
    return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
  };
  return sortSegments(segments)
    .map((s) => `${stamp(s.start)}${s.text.replace(/\s*\|\s*/g, " ⁙ ")}`)
    .join("\n");
}
