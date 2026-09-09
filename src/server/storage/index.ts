import { BlobStore } from "./blob-store";
import { FsStore } from "./fs-store";
import type { Store } from "./types";

let cached: Store | null = null;

/**
 * اگر توکن Vercel Blob تنظیم شده باشد از فضای ابری استفاده می‌کنیم،
 * وگرنه روی دیسک محلی می‌نویسیم. این کار اجرای محلی را بدون هیچ پیکربندی ممکن می‌کند.
 */
export function getStore(): Store {
  if (cached) return cached;
  cached = process.env.BLOB_READ_WRITE_TOKEN ? new BlobStore() : new FsStore();
  return cached;
}

export type { Store } from "./types";
