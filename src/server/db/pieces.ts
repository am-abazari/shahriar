import { nanoid } from "nanoid";
import type { Piece, PieceForm, PieceSummary, Segment } from "@/lib/types";
import { query } from "./client";
import { deleteAudio } from "./audio";

export interface PieceData {
  title: string;
  poet: string;
  note: string;
  form: PieceForm;
  accent: string;
  audioId: string;
  audioName: string;
  audioType: string;
  audioSize: number;
  duration: number;
  segments: Segment[];
}

interface PieceRow {
  id: string;
  title: string;
  poet: string;
  note: string;
  form: PieceForm;
  accent: string;
  audio_id: string | null;
  audio_name: string;
  audio_type: string;
  audio_size: string | number;
  duration: string | number;
  segments: Segment[] | string;
  created_at: string | Date;
  updated_at: string | Date;
  segment_count?: string | number;
}

/** نشانی پخش، همیشه از شناسه‌ی صوت ساخته می‌شود تا در دیتابیس تکرار نشود. */
export function audioUrlFor(audioId: string | null): string {
  return audioId ? `/api/files/${audioId}` : "";
}

function toPiece(row: PieceRow): Piece {
  const segments =
    typeof row.segments === "string" ? (JSON.parse(row.segments) as Segment[]) : row.segments;

  return {
    id: row.id,
    title: row.title,
    poet: row.poet,
    note: row.note,
    form: row.form,
    accent: row.accent,
    audioId: row.audio_id ?? "",
    audioUrl: audioUrlFor(row.audio_id),
    audioName: row.audio_name,
    audioType: row.audio_type,
    audioSize: Number(row.audio_size),
    duration: Number(row.duration),
    segments: segments ?? [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const COLUMNS = `id, title, poet, note, form, accent, audio_id, audio_name,
                 audio_type, audio_size, duration, segments, created_at, updated_at`;

export async function listPieces(): Promise<PieceSummary[]> {
  // شمارش سطرها در خود دیتابیس انجام می‌شود تا متن کامل شعرها به سرور کشیده نشود.
  const rows = await query<PieceRow>(
    `select id, title, poet, note, form, accent, audio_id, audio_name, audio_type,
            audio_size, duration, created_at, updated_at,
            jsonb_array_length(segments) as segment_count
       from pieces
      order by created_at desc`,
  );

  return rows.map((row) => {
    const { segments: _segments, ...rest } = toPiece({ ...row, segments: [] });
    return { ...rest, segmentCount: Number(row.segment_count ?? 0) };
  });
}

export async function getPiece(id: string): Promise<Piece | null> {
  const rows = await query<PieceRow>(`select ${COLUMNS} from pieces where id = $1`, [id]);
  return rows[0] ? toPiece(rows[0]) : null;
}

export async function createPiece(data: PieceData): Promise<Piece> {
  const id = nanoid(10);
  const rows = await query<PieceRow>(
    `insert into pieces (id, title, poet, note, form, accent, audio_id, audio_name,
                         audio_type, audio_size, duration, segments)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
     returning ${COLUMNS}`,
    [
      id,
      data.title,
      data.poet,
      data.note,
      data.form,
      data.accent,
      data.audioId || null,
      data.audioName,
      data.audioType,
      data.audioSize,
      data.duration,
      JSON.stringify(data.segments),
    ],
  );
  return toPiece(rows[0]);
}

export async function updatePiece(id: string, data: PieceData): Promise<Piece | null> {
  const existing = await getPiece(id);
  if (!existing) return null;

  const rows = await query<PieceRow>(
    `update pieces
        set title = $2, poet = $3, note = $4, form = $5, accent = $6, audio_id = $7,
            audio_name = $8, audio_type = $9, audio_size = $10, duration = $11,
            segments = $12::jsonb, updated_at = now()
      where id = $1
      returning ${COLUMNS}`,
    [
      id,
      data.title,
      data.poet,
      data.note,
      data.form,
      data.accent,
      data.audioId || null,
      data.audioName,
      data.audioType,
      data.audioSize,
      data.duration,
      JSON.stringify(data.segments),
    ],
  );

  // فایل صوتی قبلی وقتی اثر صدای تازه‌ای گرفته، دیگر به کار نمی‌آید.
  if (existing.audioId && existing.audioId !== data.audioId) {
    await deleteAudio(existing.audioId);
  }
  return toPiece(rows[0]);
}

export async function removePiece(id: string): Promise<boolean> {
  const existing = await getPiece(id);
  if (!existing) return false;

  await query(`delete from pieces where id = $1`, [id]);
  if (existing.audioId) await deleteAudio(existing.audioId);
  return true;
}
