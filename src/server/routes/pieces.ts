import { Router } from "express";
import { sortSegments } from "@/lib/segments";
import { roundTime } from "@/lib/time";
import { createPiece, getPiece, listPieces, removePiece, updatePiece } from "../db/pieces";
import { getAudio } from "../db/audio";
import { assertNoOverlap, pieceInputSchema } from "../validation";
import { requireAdmin } from "./guard";

export const piecesRouter: Router = Router();

/** گرد کردن زمان‌ها پیش از ذخیره تا داده‌ی دیتابیس تمیز بماند. */
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

/** اعتبارسنجی مشترک ساخت و ویرایش. */
async function readBody(body: unknown) {
  const parsed = pieceInputSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "داده‌های ارسالی معتبر نیست.",
      status: 400 as const,
    };
  }

  const data = normalise(parsed.data);

  const overlap = assertNoOverlap(data.segments);
  if (overlap) return { error: overlap, status: 400 as const };

  // نباید بشود اثری را به فایل صوتیِ ناتمام یا ناموجود گره زد.
  const audio = await getAudio(data.audioId);
  if (!audio || !audio.complete) {
    return { error: "فایل صوتی این اثر کامل بارگذاری نشده است.", status: 400 as const };
  }

  return { data };
}

piecesRouter.get("/", async (_req, res) => {
  res.json({ pieces: await listPieces() });
});

piecesRouter.get("/:id", async (req, res) => {
  const piece = await getPiece(String(req.params.id));
  if (!piece) {
    res.status(404).json({ error: "این اثر پیدا نشد." });
    return;
  }
  res.json({ piece });
});

piecesRouter.post("/", requireAdmin, async (req, res) => {
  const result = await readBody(req.body);
  if (!result.data) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json({ piece: await createPiece(result.data) });
});

piecesRouter.put("/:id", requireAdmin, async (req, res) => {
  const result = await readBody(req.body);
  if (!result.data) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  const piece = await updatePiece(String(req.params.id), result.data);
  if (!piece) {
    res.status(404).json({ error: "این اثر پیدا نشد." });
    return;
  }
  res.json({ piece });
});

piecesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const removed = await removePiece(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "این اثر پیدا نشد." });
    return;
  }
  res.json({ ok: true });
});
