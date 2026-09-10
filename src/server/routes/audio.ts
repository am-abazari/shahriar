import { Router, type Request, type Response } from "express";
import {
  DB_CHUNK,
  UPLOAD_CHUNK,
  createAudio,
  finishAudio,
  getAudio,
  pruneIncompleteAudio,
  readRange,
  writeChunk,
} from "../db/audio";
import { MAX_AUDIO_BYTES, uploadInitSchema } from "../validation";
import { requireAdmin } from "./guard";

export const uploadRouter: Router = Router();
export const filesRouter: Router = Router();

/* ————————————————— آپلود تکه‌تکه ————————————————— */

uploadRouter.post("/init", requireAdmin, async (req, res) => {
  const parsed = uploadInitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "داده نامعتبر است." });
    return;
  }
  if (parsed.data.size > MAX_AUDIO_BYTES) {
    const mb = Math.floor(MAX_AUDIO_BYTES / (1024 * 1024));
    res.status(413).json({ error: `حجم فایل بیشتر از ${mb} مگابایت است.` });
    return;
  }

  // هر بار که آپلود تازه‌ای آغاز می‌شود، آشغال‌های رهاشده‌ی قبلی را جمع می‌کنیم.
  pruneIncompleteAudio().catch(() => {});

  const id = await createAudio(parsed.data.name, parsed.data.type, parsed.data.size);
  res.status(201).json({ audioId: id, chunkSize: UPLOAD_CHUNK });
});

uploadRouter.post("/chunk", requireAdmin, async (req, res) => {
  const audioId = String(req.query.audioId ?? "");
  const index = Number(req.query.index ?? -1);
  const body = req.body as Buffer;

  if (!audioId || !Number.isInteger(index) || index < 0) {
    res.status(400).json({ error: "پارامترهای بخش نامعتبر است." });
    return;
  }
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "بخش خالی دریافت شد." });
    return;
  }
  if (body.length > UPLOAD_CHUNK) {
    res.status(413).json({ error: "اندازه‌ی بخش بیش از حد مجاز است." });
    return;
  }

  const audio = await getAudio(audioId);
  if (!audio) {
    res.status(404).json({ error: "این آپلود پیدا نشد." });
    return;
  }

  await writeChunk(audioId, index, body);
  res.json({ ok: true, index });
});

uploadRouter.post("/finish", requireAdmin, async (req, res) => {
  const audioId = String((req.body as { audioId?: string })?.audioId ?? "");
  if (!audioId) {
    res.status(400).json({ error: "شناسه‌ی آپلود لازم است." });
    return;
  }

  const audio = await finishAudio(audioId);
  if (!audio) {
    res.status(400).json({ error: "هیچ داده‌ای برای این آپلود ثبت نشده است." });
    return;
  }
  res.json({ audio: { id: audio.id, name: audio.name, type: audio.mime, size: audio.size } });
});

/* ————————————————— پخش ————————————————— */

/** حداکثر حجمی که در یک پاسخ Range فرستاده می‌شود. */
const RANGE_WINDOW = 2 * 1024 * 1024;

filesRouter.get("/:id", async (req: Request, res: Response) => {
  const audio = await getAudio(String(req.params.id));
  if (!audio || !audio.complete) {
    res.status(404).json({ error: "فایل صوتی پیدا نشد." });
    return;
  }

  const size = audio.size;
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", audio.mime || "audio/mpeg");
  // محتوای هر شناسه ثابت است، پس می‌تواند برای مدت طولانی کش شود.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  const range = req.headers.range;

  if (!range) {
    // بدون درخواست بازه، فقط ابتدای فایل فرستاده می‌شود تا مرورگر خودش
    // بقیه را با Range بخواهد؛ این کار حافظه‌ی تابع را هم پایین نگه می‌دارد.
    const end = Math.min(RANGE_WINDOW, size) - 1;
    const body = await readRange(audio.id, 0, end);
    if (end < size - 1) {
      res.status(206);
      res.setHeader("Content-Range", `bytes 0-${end}/${size}`);
    }
    res.setHeader("Content-Length", body.length);
    res.end(body);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) {
    res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    return;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  const end = Math.min(requestedEnd, start + RANGE_WINDOW - 1, size - 1);

  if (!Number.isFinite(start) || start >= size || start < 0 || end < start) {
    res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    return;
  }

  const body = await readRange(audio.id, start, end);
  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  res.setHeader("Content-Length", body.length);
  res.end(body);
});

export { DB_CHUNK };
