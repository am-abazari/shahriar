import { del, list, put } from "@vercel/blob";
import type { Piece, PieceSummary } from "@/lib/types";
import { toSummary, type SavedAudio, type Store } from "./types";

const PREFIX = "pieces/";

/**
 * نگهداری روی Vercel Blob. هر قطعه یک فایل JSON است و فایل صوتی جدا ذخیره می‌شود.
 * نشانی هر blob قابل حدس زدن نیست، پس نگاشت شناسه→نشانی را کوتاه‌مدت کش می‌کنیم.
 */
export class BlobStore implements Store {
  readonly mode = "blob" as const;
  readonly supportsDirectUpload = true;

  private urlCache = new Map<string, { url: string; at: number }>();
  private static CACHE_TTL = 60_000;

  private remember(id: string, url: string) {
    this.urlCache.set(id, { url, at: Date.now() });
  }

  private recall(id: string): string | null {
    const hit = this.urlCache.get(id);
    if (!hit) return null;
    if (Date.now() - hit.at > BlobStore.CACHE_TTL) {
      this.urlCache.delete(id);
      return null;
    }
    return hit.url;
  }

  private async findUrl(id: string): Promise<string | null> {
    const cached = this.recall(id);
    if (cached) return cached;
    const { blobs } = await list({ prefix: `${PREFIX}${id}.json`, limit: 1 });
    const blob = blobs.find((b) => b.pathname === `${PREFIX}${id}.json`);
    if (!blob) return null;
    this.remember(id, blob.url);
    return blob.url;
  }

  async list(): Promise<PieceSummary[]> {
    const summaries: PieceSummary[] = [];
    let cursor: string | undefined;

    do {
      const page = await list({ prefix: PREFIX, cursor, limit: 200 });
      const jsonBlobs = page.blobs.filter((b) => b.pathname.endsWith(".json"));
      const loaded = await Promise.all(
        jsonBlobs.map(async (b) => {
          try {
            const res = await fetch(b.url, { cache: "no-store" });
            if (!res.ok) return null;
            return (await res.json()) as Piece;
          } catch {
            return null;
          }
        }),
      );
      for (const piece of loaded) {
        if (piece?.id) {
          summaries.push(toSummary(piece));
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Piece | null> {
    const url = await this.findUrl(id);
    if (!url) return null;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Piece;
  }

  async put(piece: Piece): Promise<void> {
    const result = await put(`${PREFIX}${piece.id}.json`, JSON.stringify(piece), {
      access: "public",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    this.remember(piece.id, result.url);
  }

  async remove(id: string): Promise<void> {
    const url = await this.findUrl(id);
    this.urlCache.delete(id);
    if (url) await del(url);
  }

  async saveAudio(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<SavedAudio> {
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_") || "audio";
    const result = await put(`audio/${Date.now()}-${safeName}`, file.buffer, {
      access: "public",
      contentType: file.mimetype,
      addRandomSuffix: true,
    });
    return {
      url: result.url,
      name: file.originalname,
      type: file.mimetype,
      size: file.buffer.byteLength,
    };
  }

  async deleteAudio(url: string): Promise<void> {
    if (!url.startsWith("http")) return;
    try {
      await del(url);
    } catch {
      // اگر فایل از قبل حذف شده باشد، خطا را نادیده می‌گیریم.
    }
  }
}
