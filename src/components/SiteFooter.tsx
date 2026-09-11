"use client";

import { usePathname } from "next/navigation";
import { toPersianDigits } from "@/lib/time";

/**
 * فوتر در صفحه‌ی یک اثر نمایش داده نمی‌شود: آنجا نوار پخش پایین صفحه را
 * می‌گیرد و هرچیزِ زیر آن فقط مزاحم خواندن شعر است.
 */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/p/")) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-white/5 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-paper-dim">
          <a
            href="https://amabazari.ir"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-gold"
          >
            amabazari.ir
          </a>
          <span className="h-1 w-1 rounded-full bg-white/15" aria-hidden />
          <a
            href="https://github.com/am-abazari/shahriar"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-gold"
          >
            <GitHubIcon />
            کد پروژه
          </a>
        </div>

        <p className="text-[11px] leading-6 text-paper-faint">
          ساخته‌شده برای شعر پارسی — شهریار · {toPersianDigits(year)}
        </p>
        <p className="text-[11px] text-paper-faint opacity-60">
          Next.js · Express · TypeScript · PostgreSQL
        </p>
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}
