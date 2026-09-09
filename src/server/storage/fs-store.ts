import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Piece, PieceSummary } from "@/lib/types";
import { toSummary, type SavedAudio, type Store } from "./types";

const ROOT = path.join(process.cwd(), ".data");
const PIECES_DIR = path.join(ROOT, "pieces");
export const UPLOADS_DIR = path.join(ROOT, "uploads");

async function ensureDirs() {
  await fs.mkdir(PIECES_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

/** نگهداری روی دیسک محلی؛ برای اجرای توسعه‌ای بدون هیچ سرویس بیرونی. */
export class FsStore implements Store {
  readonly mode = "fs" as const;
  readonly supportsDirectUpload = false;

  async list(): Promise<PieceSummary[]> {
    await ensureDirs();
    const files = await fs.readdir(PIECES_DIR);
    const pieces: PieceSummary[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(PIECES_DIR, file), "utf8");
        pieces.push(toSummary(JSON.parse(raw) as Piece));
      } catch {
        // فایل خراب را نادیده می‌گیریم تا کل فهرست از کار نیفتد.
      }
    }
    return pieces.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Piece | null> {
    await ensureDirs();
    try {
      const raw = await fs.readFile(path.join(PIECES_DIR, `${id}.json`), "utf8");
      return JSON.parse(raw) as Piece;
    } catch {
      return null;
    }
  }

  async put(piece: Piece): Promise<void> {
    await ensureDirs();
    await fs.writeFile(
      path.join(PIECES_DIR, `${piece.id}.json`),
      JSON.stringify(piece, null, 2),
      "utf8",
    );
  }

  async remove(id: string): Promise<void> {
    await ensureDirs();
    await fs.rm(path.join(PIECES_DIR, `${id}.json`), { force: true });
  }

  async saveAudio(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<SavedAudio> {
    await ensureDirs();
    const ext = path.extname(file.originalname) || guessExt(file.mimetype);
    const name = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(UPLOADS_DIR, name), file.buffer);
    return {
      url: `/api/files/${name}`,
      name: file.originalname,
      type: file.mimetype,
      size: file.buffer.byteLength,
    };
  }

  async deleteAudio(url: string): Promise<void> {
    const name = url.split("/").pop();
    if (!name) return;
    await fs.rm(path.join(UPLOADS_DIR, path.basename(name)), { force: true });
  }
}

function guessExt(mime: string): string {
  const map: Record<string, string> = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
  };
  return map[mime] ?? ".bin";
}
