import type { Piece, PieceSummary } from "./types";

export interface AppConfig {
  database: boolean;
  admin: boolean;
  chunkSize: number;
  maxUploadBytes: number;
}

export interface AuthState {
  admin: boolean;
  username: string | null;
  usingEnvPassword: boolean;
}

export interface UploadedAudio {
  id: string;
  name: string;
  type: string;
  size: number;
}

export type PiecePayload = Omit<Piece, "id" | "createdAt" | "updatedAt" | "audioUrl">;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("پاسخ سرور قابل خواندن نبود.");
  }

  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || "ارتباط با سرور برقرار نشد.");
  }
  return data as T;
}

export const api = {
  config: () => request<AppConfig>("/api/config"),
  me: () => request<AuthState>("/api/auth/me"),
  login: (username: string, password: string) =>
    request<{ ok: true; username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  changePassword: (payload: {
    currentPassword: string;
    username: string;
    newPassword: string;
  }) =>
    request<{ ok: true; username: string }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

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
 * آپلود فایل صوتی به‌صورت تکه‌تکه.
 * سقف بدنه‌ی درخواست در توابع بدون‌سرور ورسل حدود ۴٫۵ مگابایت است، پس فایل در
 * مرورگر بریده می‌شود و هر بخش جداگانه می‌رود؛ سرور آن‌ها را در دیتابیس به هم
 * می‌چسباند. همین راه، آپلود فایل‌های بلندِ دکلمه را بدون سرویس بیرونی ممکن می‌کند.
 */
export async function uploadAudio(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadedAudio> {
  const init = await request<{ audioId: string; chunkSize: number }>("/api/upload/init", {
    method: "POST",
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
  });

  const { audioId, chunkSize } = init;
  const total = Math.max(1, Math.ceil(file.size / chunkSize));

  for (let index = 0; index < total; index++) {
    const slice = file.slice(index * chunkSize, Math.min((index + 1) * chunkSize, file.size));
    await sendChunk(audioId, index, slice);
    onProgress?.((index + 1) / total);
  }

  const finished = await request<{ audio: UploadedAudio }>("/api/upload/finish", {
    method: "POST",
    body: JSON.stringify({ audioId }),
  });
  return finished.audio;
}

/** هر بخش تا سه بار تلاش می‌شود؛ قطعی لحظه‌ای نباید کل آپلود را از بین ببرد. */
async function sendChunk(audioId: string, index: number, blob: Blob, attempt = 0): Promise<void> {
  try {
    const res = await fetch(`/api/upload/chunk?audioId=${audioId}&index=${index}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string })?.error || "ارسال بخشی از فایل ناموفق بود.");
    }
  } catch (error) {
    if (attempt >= 2) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    return sendChunk(audioId, index, blob, attempt + 1);
  }
}
