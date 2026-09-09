import type { Piece, PieceSummary } from "@/lib/types";

export type StorageMode = "blob" | "fs";

export interface SavedAudio {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface Store {
  readonly mode: StorageMode;
  /** آیا آپلود مستقیم از مرورگر به فضای ابری در دسترس است؟ */
  readonly supportsDirectUpload: boolean;
  list(): Promise<PieceSummary[]>;
  get(id: string): Promise<Piece | null>;
  put(piece: Piece): Promise<void>;
  remove(id: string): Promise<void>;
  /** آپلود از طریق سرور (فقط در حالت فایل‌سیستم استفاده می‌شود). */
  saveAudio(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<SavedAudio>;
  deleteAudio(url: string): Promise<void>;
}

export function toSummary(piece: Piece): PieceSummary {
  const { segments, ...rest } = piece;
  return { ...rest, segmentCount: segments.length };
}
