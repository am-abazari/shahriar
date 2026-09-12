"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "shahriar-theme";

/**
 * اسکریپتی که پیش از نخستین رسم اجرا می‌شود.
 * بدون این، صفحه یک لحظه با تم اشتباه بالا می‌آید و بعد می‌پرد؛ چیزی که روی
 * تم روشن به‌شکل یک جرقه‌ی تاریک دیده می‌شود.
 */
export const themeBootScript = `
(function(){try{
  var stored = localStorage.getItem('${THEME_KEY}');
  var theme = stored === 'light' || stored === 'dark'
    ? stored
    : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
}catch(e){document.documentElement.dataset.theme='dark';}})();
`.trim();

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // مقدار اولیه از خودِ سند خوانده می‌شود، نه از نو محاسبه: اسکریپت بالا
  // پیش از این تصمیمش را گرفته و دو منبع حقیقت دردسر می‌سازد.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  // اگر کاربر انتخابی نکرده باشد، تغییر تنظیم سیستم باید دنبال شود.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_KEY)) return;
      const next: Theme = event.matches ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // حالت ناشناس مرورگر؛ تم برای همین نشست کار می‌کند و ذخیره نمی‌شود.
    }
    setTheme(next);
  };

  const label = theme === "light" ? "تم شبانه" : "تم روشن";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="btn btn-ghost !px-2.5"
    >
      {/* تا پیش از نخستین اجرای افکت، تم را نمی‌دانیم؛ جای دکمه را نگه می‌داریم. */}
      <span className={theme === null ? "opacity-0" : undefined}>
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
