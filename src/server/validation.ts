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
  audioId: z.string().uuid("شناسه‌ی فایل صوتی معتبر نیست."),
  audioName: z.string().max(300).default(""),
  audioType: z.string().max(120).default(""),
  audioSize: z.number().int().min(0).default(0),
  duration: z.number().finite().min(0).max(60 * 60 * 12).default(0),
  accent: z.enum(ACCENTS).default("amber"),
  segments: z.array(segmentSchema).max(2000).default([]),
});

export type PieceInput = z.infer<typeof pieceInputSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1, "نام کاربری را بنویسید.").max(120),
  password: z.string().min(1, "رمز را بنویسید.").max(300),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "رمز فعلی لازم است.").max(300),
  username: z.string().trim().min(3, "نام کاربری دست‌کم سه نویسه باشد.").max(120),
  newPassword: z
    .string()
    .min(8, "رمز تازه دست‌کم هشت نویسه باشد.")
    .max(300),
});

export const uploadInitSchema = z.object({
  name: z.string().trim().max(300).default("audio"),
  type: z.string().trim().max(120).default(""),
  size: z
    .number()
    .int()
    .positive("فایل خالی است.")
    .max(200 * 1024 * 1024, "حجم فایل بیش از حد مجاز است."),
});

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
];

export const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
