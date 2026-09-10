"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/new";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.login(username, password);
      router.replace(next);
      router.refresh();
    } catch (loginError) {
      setError((loginError as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass mx-auto w-full max-w-sm space-y-4 rounded-3xl p-7">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gold/12 text-xl">
          🔑
        </div>
        <h1 className="text-lg font-bold">ورود ادمین</h1>
        <p className="mt-2 text-xs leading-6 text-paper-dim">
          افزودن و ویرایش اثر فقط از این حساب انجام می‌شود. شنیدن آثار نیازی به ورود ندارد.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="username">نام کاربری</label>
        <input
          id="username"
          className="field"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">رمز</label>
        <input
          id="password"
          type="password"
          className="field"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs leading-6 text-red-300">{error}</p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
        {busy ? "در حال بررسی…" : "ورود"}
      </button>
    </form>
  );
}
