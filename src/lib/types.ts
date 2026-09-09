/**
 * مدل داده‌ی مشترک بین کلاینت و سرور.
 * هر «قطعه» (Segment) یک واحد زمان‌بندی‌شده است: یک مصرع، یک بیت یا یک خط از متن.
 */

export type SegmentKind = "mesra" | "beyt" | "line";

export interface Segment {
  id: string;
  /** متن قطعه؛ برای بیت می‌تواند شامل دو مصرع جداشده با «|» باشد. */
  text: string;
  /** زمان شروع بر حسب ثانیه. */
  start: number;
  /** زمان پایان بر حسب ثانیه. همیشه بزرگ‌تر از start. */
  end: number;
  /** شماره‌ی بند/بیت برای گروه‌بندی بصری. */
  group: number;
}

export type PieceForm = "ghazal" | "masnavi" | "robaei" | "free" | "song";

export const PIECE_FORMS: { value: PieceForm; label: string }[] = [
  { value: "ghazal", label: "غزل" },
  { value: "masnavi", label: "مثنوی" },
  { value: "robaei", label: "رباعی / دوبیتی" },
  { value: "free", label: "شعر نو / آزاد" },
  { value: "song", label: "ترانه و آهنگ" },
];

export interface Piece {
  id: string;
  title: string;
  poet: string;
  /** توضیح یا یادداشت کوتاه. */
  note: string;
  form: PieceForm;
  /** نشانی فایل صوتی (Blob یا مسیر محلی). */
  audioUrl: string;
  audioName: string;
  audioType: string;
  audioSize: number;
  /** مدت‌زمان کل فایل بر حسب ثانیه. */
  duration: number;
  segments: Segment[];
  /** رنگ لهجه‌ی کارت، یکی از کلیدهای ACCENTS. */
  accent: string;
  createdAt: string;
  updatedAt: string;
}

/** خلاصه‌ی سبک برای فهرست‌ها (بدون قطعات). */
export type PieceSummary = Omit<Piece, "segments"> & { segmentCount: number };

export const ACCENTS = ["amber", "rose", "violet", "emerald", "sky"] as const;
export type Accent = (typeof ACCENTS)[number];

export interface ApiError {
  error: string;
  details?: unknown;
}
