"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Props {
  username: string;
  usingEnvPassword: boolean;
}

export function AdminPanel({ username, usingEnvPassword }: Props) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== repeat) {
      setError("رمز تازه با تکرارش یکی نیست.");
      return;
    }

    setBusy(true);
    try {
      await api.changePassword({ currentPassword, username: newUsername, newPassword });
      setMessage("نام کاربری و رمز به‌روزرسانی شد.");
      setCurrentPassword("");
      setNewPassword("");
      setRepeat("");
      router.refresh();
    } catch (changeError) {
      setError((changeError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">حساب ادمین</h1>
            <p className="mt-1 text-sm text-paper-dim">{username}</p>
          </div>
          <button type="button" onClick={logout} className="btn btn-ghost !py-1.5 !text-xs">
            خروج
          </button>
        </div>

        {usingEnvPassword && (
          <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-[11px] leading-6 text-amber-200/90">
            رمز فعلی از متغیر محیطی ADMIN_PASSWORD خوانده می‌شود. با تغییر آن از همین‌جا،
            اعتبارنامه به‌صورت رمزشده در دیتابیس می‌نشیند و دیگر به آن متغیر وابسته نیست.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6">
        <h2 className="text-base font-bold">تغییر نام کاربری و رمز</h2>

        <div>
          <label className="label" htmlFor="current">رمز فعلی</label>
          <input
            id="current"
            type="password"
            className="field"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="new-username">نام کاربری تازه</label>
          <input
            id="new-username"
            className="field"
            autoComplete="username"
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="new-password">رمز تازه</label>
            <input
              id="new-password"
              type="password"
              className="field"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="repeat">تکرار رمز تازه</label>
            <input
              id="repeat"
              type="password"
              className="field"
              autoComplete="new-password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        )}
        {message && (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
          {busy ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
        </button>
      </form>
    </div>
  );
}
