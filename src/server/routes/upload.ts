import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getStore } from "../storage";
import { UPLOADS_DIR } from "../storage/fs-store";
import { ALLOWED_AUDIO_TYPES, MAX_AUDIO_BYTES, SERVER_UPLOAD_LIMIT } from "../validation";

export const uploadRouter: Router = Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SERVER_UPLOAD_LIMIT, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("فقط فایل صوتی پذیرفته می‌شود."));
  },
});

/** آپلود از راه سرور. در ورسل به سقف بدنه‌ی درخواست محدود است. */
uploadRouter.post("/", memoryUpload.single("audio"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "فایلی دریافت نشد." });
    return;
  }
  const saved = await getStore().saveAudio({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
  });
  res.status(201).json({ audio: saved });
});

/**
 * صدور توکن برای آپلود مستقیم مرورگر → Vercel Blob.
 * این مسیر سقف ۴٫۵ مگابایتی بدنه‌ی توابع بدون‌سرور را دور می‌زند.
 */
uploadRouter.post("/token", async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(501).json({ error: "آپلود مستقیم در این محیط فعال نیست." });
    return;
  }
  try {
    const result = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_AUDIO_TYPES,
        maximumSizeInBytes: MAX_AUDIO_BYTES,
        addRandomSuffix: true,
      }),
      // چیزی برای انجام نیست: کلاینت خودش نشانی را همراه ساخت اثر می‌فرستد.
      onUploadCompleted: async () => {},
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export const filesRouter: Router = Router();

const RANGE_CHUNK = 1024 * 1024;

/** سرو فایل‌های محلی همراه با پشتیبانی از Range تا جابه‌جایی در نوار پخش کار کند. */
filesRouter.get("/:name", async (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(UPLOADS_DIR, name);

  let size: number;
  try {
    const stat = await fs.stat(filePath);
    size = stat.size;
  } catch {
    res.status(404).json({ error: "فایل پیدا نشد." });
    return;
  }

  const type = contentTypeFor(name);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  const range = req.headers.range;
  if (!range) {
    res.setHeader("Content-Length", size);
    createReadStream(filePath).pipe(res);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) {
    res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    return;
  }
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : Math.min(start + RANGE_CHUNK - 1, size - 1);

  if (start >= size || end >= size || start > end) {
    res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    return;
  }

  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  res.setHeader("Content-Length", end - start + 1);
  createReadStream(filePath, { start, end }).pipe(res);
});

function contentTypeFor(name: string): string {
  const map: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
  };
  return map[path.extname(name).toLowerCase()] ?? "application/octet-stream";
}
