import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { hasDatabase } from "./db/client";
import { UPLOAD_CHUNK } from "./db/audio";
import { piecesRouter } from "./routes/pieces";
import { filesRouter, uploadRouter } from "./routes/audio";
import { authRouter, isAdminRequest } from "./routes/auth";
import { MAX_AUDIO_BYTES } from "./validation";

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

  // بخش‌های آپلود، بایت خام هستند و نباید از صافیِ JSON رد شوند.
  instance.use("/api/upload/chunk", express.raw({ type: "*/*", limit: "5mb" }));
  instance.use(express.json({ limit: "4mb" }));

  instance.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "shahriar", database: hasDatabase() });
  });

  instance.get("/api/config", async (req, res) => {
    res.json({
      database: hasDatabase(),
      admin: await isAdminRequest(req),
      chunkSize: UPLOAD_CHUNK,
      maxUploadBytes: MAX_AUDIO_BYTES,
    });
  });

  instance.use("/api/auth", authRouter);
  instance.use("/api/pieces", piecesRouter);
  instance.use("/api/upload", uploadRouter);
  instance.use("/api/files", filesRouter);

  instance.use("/api", (_req, res) => {
    res.status(404).json({ error: "این مسیر وجود ندارد." });
  });

  instance.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = (error as Error)?.message ?? "خطای غیرمنتظره در سرور.";
    console.error("[shahriar] unhandled error:", error);

    // پیام «نشانی دیتابیس تنظیم نشده» راهنمای پیکربندی است، نه خطای داخلی.
    const status = message.includes("DATABASE_URL") ? 503 : 500;
    res.status(status).json({ error: message });
  });

  app = instance;
  return app;
}
