import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { MulterError } from "multer";
import { getStore } from "./storage";
import { piecesRouter } from "./routes/pieces";
import { filesRouter, uploadRouter } from "./routes/upload";
import { MAX_AUDIO_BYTES, SERVER_UPLOAD_LIMIT } from "./validation";

let app: Express | null = null;

/**
 * اپلیکیشن Express به‌صورت تک‌نمونه ساخته می‌شود تا در فراخوانی‌های بعدیِ
 * همان نمونه‌ی تابع بدون‌سرور دوباره ساخته نشود.
 */
export function getExpressApp(): Express {
  if (app) return app;

  const instance = express();
  instance.disable("x-powered-by");
  instance.set("trust proxy", true);

  // آپلود مالتی‌پارت را multer می‌خواند، پس JSON فقط برای بقیه‌ی مسیرها لازم است.
  instance.use(express.json({ limit: "8mb" }));

  instance.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "shahriar", time: new Date().toISOString() });
  });

  instance.get("/api/config", (_req, res) => {
    const store = getStore();
    res.json({
      storage: store.mode,
      directUpload: store.supportsDirectUpload,
      maxUploadBytes: store.supportsDirectUpload ? MAX_AUDIO_BYTES : SERVER_UPLOAD_LIMIT,
      persistent: store.mode === "blob",
    });
  });

  instance.use("/api/pieces", piecesRouter);
  instance.use("/api/upload", uploadRouter);
  instance.use("/api/files", filesRouter);

  instance.use("/api", (_req, res) => {
    res.status(404).json({ error: "این مسیر وجود ندارد." });
  });

  instance.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "حجم فایل بیش از حد مجاز است."
          : "خطا در دریافت فایل.";
      res.status(413).json({ error: message });
      return;
    }
    console.error("[shahriar] unhandled error:", error);
    res.status(500).json({ error: (error as Error)?.message || "خطای غیرمنتظره در سرور." });
  });

  app = instance;
  return app;
}
