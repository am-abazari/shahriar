import type { Piece, PieceSummary } from "./types";

export interface AppConfig {
  storage: "blob" | "fs";
  directUpload: boolean;
  maxUploadBytes: number;
  persistent: boolean;
}

export interface UploadedAudio {
  url: string;
  name: string;
  type: string;
  size: number;
}

export type PiecePayload = Omit<Piece, "id" | "createdAt" | "updatedAt">;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(data?.error || "ارتباط با سرور برقرار نشد.");
  }
  return data as T;
}

export const api = {
  config: () => request<AppConfig>("/api/config"),
  listPieces: () => request<{ pieces: PieceSummary[] }>("/api/pieces").then((r) => r.pieces),
  getPiece: (id: string) => request<{ piece: Piece }>(`/api/pieces/${id}`).then((r) => r.piece),
  createPiece: (payload: PiecePayload) =>
    request<{ piece: Piece }>("/api/pieces", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((r) => r.piece),
  updatePiece: (id: string, payload: PiecePayload) =>
    request<{ piece: Piece }>(`/api/pieces/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((r) => r.piece),
  deletePiece: (id: string) => request<{ ok: true }>(`/api/pieces/${id}`, { method: "DELETE" }),
};

/**
 * آپلود فایل صوتی.
 * وقتی Vercel Blob در دسترس باشد، فایل مستقیم از مرورگر به فضای ابری می‌رود تا
 * سقف بدنه‌ی توابع بدون‌سرور مانع نشود؛ در غیر این صورت از راه سرور می‌فرستیم.
 */
export async function uploadAudio(
  file: File,
  config: AppConfig,
  onProgress?: (fraction: number) => void,
): Promise<UploadedAudio> {
  if (file.size > config.maxUploadBytes) {
    const mb = Math.floor(config.maxUploadBytes / (1024 * 1024));
    throw new Error(`حجم فایل بیشتر از ${mb} مگابایت است.`);
  }

  if (config.directUpload) {
    const { upload } = await import("@vercel/blob/client");
    const result = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/upload/token",
      contentType: file.type || "audio/mpeg",
      // فایل‌های بلندِ دکلمه در چند تکه‌ی موازی بالا می‌روند و در صورت خطا تکرار می‌شوند.
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress?.(percentage / 100),
    });
    return { url: result.url, name: file.name, type: file.type, size: file.size };
  }

  return uploadThroughServer(file, onProgress);
}

/** XHR به‌جای fetch استفاده می‌شود چون درصد پیشرفت آپلود را می‌دهد. */
function uploadThroughServer(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadedAudio> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("audio", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.audio as UploadedAudio);
        } else {
          reject(new Error(data.error || "آپلود ناموفق بود."));
        }
      } catch {
        reject(new Error("پاسخ سرور قابل خواندن نبود."));
      }
    };

    xhr.onerror = () => reject(new Error("ارتباط در حین آپلود قطع شد."));
    xhr.send(body);
  });
}
