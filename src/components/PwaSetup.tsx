"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * ثبت سرویس‌ورکر و دکمه‌ی نصب.
 * دکمه فقط وقتی پیدا می‌شود که مرورگر خودش اعلام کند برنامه نصب‌شدنی است؛
 * دکمه‌ای که کاری نمی‌کند بدتر از نبودنش است.
 */
export function PwaSetup() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // ثبت پس از load انجام می‌شود تا با بارگذاری نخستین صفحه رقابت نکند.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // نصب‌نشدن سرویس‌ورکر نباید چیزی از کار بیندازد؛ برنامه بدون آن هم کار می‌کند.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <button
      type="button"
      onClick={install}
      title="نصب شهریار روی دستگاه"
      aria-label="نصب برنامه"
      className="btn btn-ghost !px-2.5"
    >
      <InstallIcon />
      <span className="hidden sm:inline">نصب</span>
    </button>
  );
}

function InstallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
