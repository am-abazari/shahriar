"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCENTS, PIECE_FORMS, type Piece, type PieceForm } from "@/lib/types";
import { draftFromSegments, draftFromText, draftIssues, draftToSegments, type DraftSegment } from "@/lib/draft";
import { toPersianDigits } from "@/lib/time";
import { api, uploadAudio, type AppConfig } from "@/lib/api";
import { SyncEditor } from "./SyncEditor";
import { useAudioEngine } from "./useAudioEngine";

interface Props {
  /** در حالت ویرایش، اثر موجود. در حالت افزودن، undefined. */
  piece?: Piece;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done" }
  | { status: "error"; message: string };

export function PieceComposer({ piece }: Props) {
  const router = useRouter();
  const editing = Boolean(piece);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [title, setTitle] = useState(piece?.title ?? "");
  const [poet, setPoet] = useState(piece?.poet ?? "");
  const [note, setNote] = useState(piece?.note ?? "");
  const [form, setForm] = useState<PieceForm>(piece?.form ?? "ghazal");
  const [accent, setAccent] = useState(piece?.accent ?? "amber");

  // نشانی محلی برای پخش فوری، و نشانی نهایی برای ذخیره.
  const [localUrl, setLocalUrl] = useState<string | null>(piece?.audioUrl ?? null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(piece?.audioUrl ?? null);
  const [audioMeta, setAudioMeta] = useState({
    name: piece?.audioName ?? "",
    type: piece?.audioType ?? "",
    size: piece?.audioSize ?? 0,
  });
  const [upload, setUpload] = useState<UploadState>(editing ? { status: "done" } : { status: "idle" });

  const [draft, setDraft] = useState<DraftSegment[]>(() =>
    piece ? draftFromSegments(piece.segments) : [],
  );
  const [lyricsText, setLyricsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engine = useAudioEngine(localUrl);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const duration = engine.duration || piece?.duration || 0;
  const issues = useMemo(() => draftIssues(draft, duration), [draft, duration]);
  const timedSegments = useMemo(() => draftToSegments(draft), [draft]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setError("لطفاً یک فایل صوتی انتخاب کنید.");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLocalUrl(url);
    setRemoteUrl(null);
    setAudioMeta({ name: file.name, type: file.type, size: file.size });
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));

    const cfg = config ?? (await api.config().catch(() => null));
    if (!cfg) {
      setUpload({ status: "error", message: "پیکربندی سرور در دسترس نیست." });
      return;
    }
    setConfig(cfg);
    setUpload({ status: "uploading", progress: 0 });

    try {
      const saved = await uploadAudio(file, cfg, (fraction) =>
        setUpload({ status: "uploading", progress: fraction }),
      );
      setRemoteUrl(saved.url);
      setAudioMeta({ name: saved.name, type: saved.type, size: saved.size });
      setUpload({ status: "done" });
    } catch (uploadError) {
      setUpload({ status: "error", message: (uploadError as Error).message });
    }
  };

  const applyLyrics = () => {
    const parsed = draftFromText(lyricsText);
    if (!parsed.length) {
      setError("متنی برای افزودن پیدا نشد.");
      return;
    }
    setDraft(parsed);
    setLyricsText("");
    setError(null);
  };

  const save = async () => {
    setError(null);

    if (!title.trim()) {
      setError("عنوان اثر را بنویسید.");
      return;
    }
    if (!remoteUrl) {
      setError(
        upload.status === "uploading"
          ? "آپلود هنوز تمام نشده است."
          : "ابتدا فایل صوتی را بارگذاری کنید.",
      );
      return;
    }
    if (issues.size > 0) {
      setError("چند سطر ایراد زمان‌بندی دارند؛ پیش از ذخیره آن‌ها را درست کنید.");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      poet: poet.trim(),
      note: note.trim(),
      form,
      accent,
      audioUrl: remoteUrl,
      audioName: audioMeta.name,
      audioType: audioMeta.type,
      audioSize: audioMeta.size,
      duration,
      segments: timedSegments,
    };

    try {
      const result = piece
        ? await api.updatePiece(piece.id, payload)
        : await api.createPiece(payload);
      router.push(`/p/${result.id}`);
      router.refresh();
    } catch (saveError) {
      setError((saveError as Error).message);
      setSaving(false);
    }
  };

  return (
    <div data-accent={accent} className="mx-auto w-full max-w-4xl px-5 pb-32 pt-10">
      {localUrl && (
        <audio ref={engine.audioRef} src={localUrl} preload="metadata" crossOrigin="anonymous" />
      )}

      <h1 className="text-2xl font-bold">{editing ? "ویرایش اثر" : "افزودن اثر تازه"}</h1>
      <p className="mt-2 text-sm text-paper-dim">
        صدا را بگذارید، متن را بچسبانید و مرز هر مصرع را همان‌طور که گوش می‌دهید ثبت کنید.
      </p>

      {config && !config.persistent && (
        <p className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-xs leading-6 text-amber-200/90">
          این محیط روی دیسک محلی ذخیره می‌کند. برای ماندگاری روی ورسل، یک فضای Blob به پروژه وصل کنید.
        </p>
      )}

      <Section step={1} title="فایل صوتی">
        <AudioDrop
          onFile={handleFile}
          upload={upload}
          fileName={audioMeta.name}
          hasAudio={Boolean(localUrl)}
          maxBytes={config?.maxUploadBytes ?? 0}
        />
      </Section>

      <Section step={2} title="مشخصات اثر">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">عنوان</label>
            <input
              id="title"
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلاً: غزل ۱ حافظ"
            />
          </div>
          <div>
            <label className="label" htmlFor="poet">شاعر یا خواننده</label>
            <input
              id="poet"
              className="field"
              value={poet}
              onChange={(event) => setPoet(event.target.value)}
              placeholder="مثلاً: حافظ شیرازی"
            />
          </div>
          <div>
            <label className="label" htmlFor="form">قالب</label>
            <select
              id="form"
              className="field"
              value={form}
              onChange={(event) => setForm(event.target.value as PieceForm)}
            >
              {PIECE_FORMS.map((item) => (
                <option key={item.value} value={item.value} className="bg-ink-800">
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">رنگ اثر</span>
            <div className="flex items-center gap-2 pt-1">
              {ACCENTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  data-accent={name}
                  onClick={() => setAccent(name)}
                  aria-label={`رنگ ${name}`}
                  aria-pressed={accent === name}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    accent === name ? "scale-110 border-white/70" : "border-white/10 hover:scale-105"
                  }`}
                  style={{ background: "rgb(var(--accent))" }}
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="note">یادداشت</label>
            <textarea
              id="note"
              rows={2}
              className="field resize-y leading-7"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="توضیح کوتاه، مأخذ یا نام دکلمه‌کننده…"
            />
          </div>
        </div>
      </Section>

      <Section step={3} title="متن و زمان‌بندی">
        {draft.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs leading-6 text-paper-dim">
              هر سطر یک مصرع است. یک خط خالی میان دو گروه، بندها را از هم جدا می‌کند.
              اگر می‌خواهید یک بیت کامل در یک سطر باشد، دو مصرع را با «|» جدا کنید.
            </p>
            <textarea
              rows={10}
              dir="rtl"
              className="field scrollbar-slim resize-y leading-9"
              value={lyricsText}
              onChange={(event) => setLyricsText(event.target.value)}
              placeholder={"الا یا ایها الساقی ادر کأسا و ناولها\nکه عشق آسان نمود اول ولی افتاد مشکل‌ها\n\nبه بوی نافه‌ای کاخر صبا زان طره بگشاید\nز تاب جعد مشکینش چه خون افتاد در دل‌ها"}
            />
            <button type="button" onClick={applyLyrics} className="btn btn-primary" disabled={!lyricsText.trim()}>
              افزودن سطرها
            </button>
          </div>
        ) : (
          <SyncEditor draft={draft} onChange={setDraft} engine={engine} />
        )}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0 text-xs">
            {error ? (
              <p className="text-red-300">{error}</p>
            ) : issues.size > 0 ? (
              <p className="text-amber-300/90">
                {toPersianDigits(issues.size)} سطر ایراد زمان‌بندی دارد
              </p>
            ) : (
              <p className="text-paper-faint">
                {toPersianDigits(timedSegments.length)} سطر آماده‌ی ذخیره است
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.back()} className="btn btn-ghost">
              بازگشت
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || upload.status === "uploading"}
              className="btn btn-primary !px-6"
            >
              {saving ? "در حال ذخیره…" : editing ? "ذخیره‌ی تغییرات" : "انتشار اثر"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[rgb(var(--accent))]/15 text-xs font-bold text-[rgb(var(--accent-soft))]">
          {toPersianDigits(step)}
        </span>
        <h2 className="text-base font-bold">{title}</h2>
        <span className="h-px flex-1 bg-white/5" />
      </div>
      {children}
    </section>
  );
}

function AudioDrop({
  onFile,
  upload,
  fileName,
  hasAudio,
  maxBytes,
}: {
  onFile: (file: File) => void;
  upload: UploadState;
  fileName: string;
  hasAudio: boolean;
  maxBytes: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${
        dragging
          ? "border-[rgb(var(--accent))]/60 bg-[rgb(var(--accent))]/[0.06]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />

      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[rgb(var(--accent))]/12 text-xl">
        🎙️
      </div>

      {hasAudio ? (
        <p className="text-sm text-paper">{fileName || "فایل صوتی بارگذاری شد"}</p>
      ) : (
        <p className="text-sm text-paper-dim">فایل صدا را اینجا رها کنید</p>
      )}

      <p className="mt-1 text-[11px] text-paper-faint">
        mp3 · m4a · wav · ogg
        {maxBytes > 0 && ` — تا ${toPersianDigits(Math.floor(maxBytes / (1024 * 1024)))} مگابایت`}
      </p>

      {upload.status === "uploading" && (
        <div className="mx-auto mt-4 max-w-xs">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[rgb(var(--accent))] transition-[width]"
              style={{ width: `${Math.round(upload.progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-paper-faint">
            در حال بارگذاری… {toPersianDigits(Math.round(upload.progress * 100))}٪
          </p>
        </div>
      )}

      {upload.status === "error" && (
        <p className="mt-3 text-xs text-red-300">{upload.message}</p>
      )}

      {upload.status === "done" && hasAudio && (
        <p className="mt-3 text-xs text-emerald-300/80">بارگذاری کامل شد</p>
      )}

      <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-ghost mt-4">
        {hasAudio ? "انتخاب فایل دیگر" : "انتخاب فایل"}
      </button>
    </div>
  );
}
