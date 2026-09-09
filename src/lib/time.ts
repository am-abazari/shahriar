/** ابزارهای تبدیل زمان بین ثانیه و رشته‌ی «دقیقه:ثانیه.صدم». */

export function formatTime(seconds: number, withCentis = true): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const base = `${m}:${String(s).padStart(2, "0")}`;
  if (!withCentis) return base;
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${base}.${String(cs).padStart(2, "0")}`;
}

/** رشته‌های «1:23.45» یا «83.45» یا «۱:۲۳» را به ثانیه تبدیل می‌کند. */
export function parseTime(input: string): number | null {
  const normalized = toEnglishDigits(input).trim().replace(/،/g, ".");
  if (!normalized) return null;
  const parts = normalized.split(":");
  if (parts.length > 3) return null;
  let total = 0;
  for (const part of parts) {
    if (!/^\d*\.?\d*$/.test(part) || part === "" || part === ".") return null;
    total = total * 60 + Number(part);
  }
  return Number.isFinite(total) ? total : null;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p > -1) return String(p);
    return String(ARABIC_DIGITS.indexOf(ch));
  });
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** زمان را به دقیقه:ثانیه با ارقام فارسی برمی‌گرداند. */
export function formatTimeFa(seconds: number, withCentis = false): string {
  return toPersianDigits(formatTime(seconds, withCentis));
}

/** گرد کردن به دو رقم اعشار تا از خطای ممیز شناور جلوگیری شود. */
export function roundTime(seconds: number): number {
  return Math.round(seconds * 100) / 100;
}
