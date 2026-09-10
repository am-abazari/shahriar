import { randomUUID } from "node:crypto";
import { query } from "./client";

/** اندازه‌ی هر ردیف صوت در دیتابیس. */
export const DB_CHUNK = 512 * 1024;
/**
 * اندازه‌ی هر بخش در آپلود مرورگر.
 * سقف بدنه‌ی درخواست در توابع بدون‌سرور ورسل ۴٫۵ مگابایت است، پس با حاشیه‌ی امن
 * ۳ مگابایت می‌فرستیم؛ مضربی از DB_CHUNK است تا ردیف‌ها دقیقاً هم‌تراز بمانند.
 */
export const UPLOAD_CHUNK = 6 * DB_CHUNK;

export interface AudioFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  complete: boolean;
}

interface AudioRow {
  id: string;
  name: string;
  mime: string;
  size: string | number;
  complete: boolean;
}

export async function createAudio(name: string, mime: string, size: number): Promise<string> {
  const id = randomUUID();
  await query(
    `insert into audio_files (id, name, mime, size, complete) values ($1, $2, $3, $4, false)`,
    [id, name.slice(0, 300), mime.slice(0, 120), size],
  );
  return id;
}

export async function getAudio(id: string): Promise<AudioFile | null> {
  const rows = await query<AudioRow>(
    `select id, name, mime, size, complete from audio_files where id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? { ...row, size: Number(row.size) } : null;
}

/**
 * نوشتن یک بخش از آپلود.
 * بخشِ دریافتی به ردیف‌های DB_CHUNK بایتی شکسته می‌شود. چون اندازه‌ی بخش مضربی
 * از اندازه‌ی ردیف است، شماره‌ی ردیف‌ها مستقیم از شماره‌ی بخش به دست می‌آید و
 * ارسال دوباره‌ی یک بخش، همان ردیف‌ها را بازنویسی می‌کند.
 */
export async function writeChunk(audioId: string, chunkIndex: number, data: Buffer): Promise<void> {
  const baseRow = chunkIndex * (UPLOAD_CHUNK / DB_CHUNK);

  for (let offset = 0, part = 0; offset < data.length; offset += DB_CHUNK, part++) {
    const slice = data.subarray(offset, Math.min(offset + DB_CHUNK, data.length));
    await query(
      `insert into audio_chunks (audio_id, idx, bytes)
       values ($1, $2, decode($3, 'hex'))
       on conflict (audio_id, idx) do update set bytes = excluded.bytes`,
      [audioId, baseRow + part, slice.toString("hex")],
    );
  }
}

/** بستن آپلود: اندازه‌ی واقعی از روی ردیف‌های نوشته‌شده تأیید می‌شود. */
export async function finishAudio(audioId: string): Promise<AudioFile | null> {
  const rows = await query<{ total: string | null }>(
    `select sum(octet_length(bytes))::text as total from audio_chunks where audio_id = $1`,
    [audioId],
  );
  const total = Number(rows[0]?.total ?? 0);
  if (total <= 0) return null;

  await query(`update audio_files set size = $2, complete = true where id = $1`, [audioId, total]);
  return getAudio(audioId);
}

export async function deleteAudio(audioId: string): Promise<void> {
  // ردیف‌های صوت با on delete cascade خودشان پاک می‌شوند.
  await query(`delete from audio_files where id = $1`, [audioId]);
}

/** پاک‌کردن آپلودهای نیمه‌تمامی که رها شده‌اند. */
export async function pruneIncompleteAudio(olderThanHours = 24): Promise<void> {
  await query(
    `delete from audio_files
     where complete = false and created_at < now() - ($1 || ' hours')::interval`,
    [String(olderThanHours)],
  );
}

/**
 * خواندن بازه‌ی [start, end] از فایل صوتی.
 * فقط ردیف‌هایی که با بازه هم‌پوشانی دارند از دیتابیس خوانده می‌شوند، پس
 * جابه‌جایی روی نوار پخش کل فایل را نمی‌کشد.
 */
export async function readRange(audioId: string, start: number, end: number): Promise<Buffer> {
  const firstRow = Math.floor(start / DB_CHUNK);
  const lastRow = Math.floor(end / DB_CHUNK);

  const rows = await query<{ idx: number; hex: string }>(
    `select idx, encode(bytes, 'hex') as hex
       from audio_chunks
      where audio_id = $1 and idx between $2 and $3
      order by idx`,
    [audioId, firstRow, lastRow],
  );

  if (!rows.length) return Buffer.alloc(0);

  const parts = rows.map((row) => Buffer.from(row.hex, "hex"));
  const joined = Buffer.concat(parts);

  // آغاز نخستین ردیفِ خوانده‌شده در مقیاس کل فایل.
  const windowStart = rows[0].idx * DB_CHUNK;
  return joined.subarray(start - windowStart, end - windowStart + 1);
}
