import { Router } from "express";
import { nanoid } from "nanoid";
import type { Piece } from "@/lib/types";
import { sortSegments } from "@/lib/segments";
import { roundTime } from "@/lib/time";
import { getStore } from "../storage";
import { assertNoOverlap, pieceInputSchema } from "../validation";

export const piecesRouter: Router = Router();

/** گرد کردن زمان‌ها پیش از ذخیره تا داده‌ی روی دیسک تمیز بماند. */
function normalise(input: ReturnType<typeof pieceInputSchema.parse>) {
  const segments = sortSegments(
    input.segments.map((s) => ({
      ...s,
      text: s.text.trim(),
      start: roundTime(s.start),
      end: roundTime(s.end),
    })),
  );
  return { ...input, segments, duration: roundTime(input.duration) };
}

piecesRouter.get("/", async (_req, res) => {
  const pieces = await getStore().list();
  res.json({ pieces });
});

piecesRouter.get("/:id", async (req, res) => {
  const piece = await getStore().get(req.params.id);
  if (!piece) {
    res.status(404).json({ error: "این اثر پیدا نشد." });
    return;
  }
  res.json({ piece });
});

piecesRouter.post("/", async (req, res) => {
  const parsed = pieceInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "داده‌های ارسالی معتبر نیست.", details: parsed.error.flatten() });
    return;
  }
  const data = normalise(parsed.data);
  const overlap = assertNoOverlap(data.segments);
  if (overlap) {
    res.status(400).json({ error: overlap });
    return;
  }

  const now = new Date().toISOString();
  const piece: Piece = { id: nanoid(10), ...data, createdAt: now, updatedAt: now };
  await getStore().put(piece);
  res.status(201).json({ piece });
});

piecesRouter.put("/:id", async (req, res) => {
  const store = getStore();
  const existing = await store.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "این اثر پیدا نشد." });
    return;
  }

  const parsed = pieceInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "داده‌های ارسالی معتبر نیست.", details: parsed.error.flatten() });
    return;
  }
  const data = normalise(parsed.data);
  const overlap = assertNoOverlap(data.segments);
  if (overlap) {
    res.status(400).json({ error: overlap });
    return;
  }

  // اگر فایل صوتی عوض شده، فایل قبلی را آزاد می‌کنیم.
  if (existing.audioUrl && existing.audioUrl !== data.audioUrl) {
    await store.deleteAudio(existing.audioUrl);
  }

  const piece: Piece = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await store.put(piece);
  res.json({ piece });
});

piecesRouter.delete("/:id", async (req, res) => {
  const store = getStore();
  const existing = await store.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "این اثر پیدا نشد." });
    return;
  }
  await store.remove(existing.id);
  if (existing.audioUrl) await store.deleteAudio(existing.audioUrl);
  res.json({ ok: true });
});
