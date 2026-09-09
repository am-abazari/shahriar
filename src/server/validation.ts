import { z } from "zod";
import { ACCENTS } from "@/lib/types";

const formEnum = z.enum(["ghazal", "masnavi", "robaei", "free", "song"]);

export const segmentSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().trim().min(1, "متن سطر نمی‌تواند خالی باشد.").max(600),
  start: z.number().finite().min(0),
  end: z.number().finite().min(0),
  group: z.number().int().min(0).max(10_000),
});

export const pieceInputSchema = z.object({
  title: z.string().trim().min(1, "عنوان لازم است.").max(160),
  poet: z.string().trim().max(120).default(""),
  note: z.string().trim().max(1200).default(""),
  form: formEnum.default("ghazal"),
  audioUrl: z.string().min(1, "فایل صوتی لازم است."),
  audioName: z.string().max(300).default(""),
  audioType: z.string().max(120).default(""),
  audioSize: z.number().int().min(0).default(0),
  duration: z.number().finite().min(0).default(0),
  accent: z.enum(ACCENTS).default("amber"),
  segments: z.array(segmentSchema).max(2000).default([]),
});

export type PieceInput = z.infer<typeof pieceInputSchema>;

/**
 * بررسی نهایی مرزهای زمانی روی سرور.
 * کلاینت هم همین قاعده را اعمال می‌کند، ولی سرور نباید به آن اعتماد کند.
 */
export function assertNoOverlap(segments: PieceInput["segments"]): string | null {
  const ordered = [...segments].sort((a, b) => a.start - b.start);
  for (let i = 0; i < ordered.length; i++) {
    const seg = ordered[i];
    if (seg.end <= seg.start) {
      return `سطر «${seg.text.slice(0, 30)}» زمان پایانِ نامعتبر دارد.`;
    }
    const next = ordered[i + 1];
    if (next && seg.end > next.start + 1e-6) {
      return `سطر «${seg.text.slice(0, 30)}» با سطر بعدی تداخل زمانی دارد.`;
    }
  }
  return null;
}

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "video/mp4",
  "video/webm",
];

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
/** سقف بدنه‌ی درخواست در توابع بدون‌سرورِ ورسل. */
export const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024;
