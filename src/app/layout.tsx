import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import Link from "next/link";
import { toPersianDigits } from "@/lib/time";
import { isAdmin } from "@/server/session";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazir",
});

export const metadata: Metadata = {
  title: {
    default: "شهریار — شعر، با صدا و هم‌زمان",
    template: "%s | شهریار",
  },
  description:
    "شهریار بستری برای انتشار شعر و غزل با صدای شاعر است؛ هر بیت دقیقاً هم‌زمان با خوانده‌شدنش روشن می‌شود.",
  keywords: ["شعر", "غزل", "دکلمه", "لیریکس", "شهریار", "صوت"],
  openGraph: {
    title: "شهریار",
    description: "شعر و غزل، هم‌زمان با صدای شاعر.",
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();

  return (
    <html lang="fa" dir="rtl" className={vazir.variable} data-accent="amber">
      <body className="antialiased">
        <div className="aurora" aria-hidden />
        <div className="grain" aria-hidden />
        <div className="flex min-h-dvh flex-col">
          <SiteHeader admin={admin} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

function SiteHeader({ admin }: { admin: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-bl from-gold-soft to-gold text-lg font-bold text-ink-950 shadow-lg shadow-gold/20">
            ش
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight">شهریار</span>
            <span className="mt-1 text-[11px] text-paper-faint">شعر، هم‌زمان با صدا</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/" className="btn btn-ghost hidden sm:inline-flex">
            گنجینه
          </Link>
          {admin ? (
            <>
              <Link
                href="/admin"
                aria-label="حساب ادمین"
                title="حساب ادمین"
                className="btn btn-ghost !px-2.5"
              >
                <GearIcon />
              </Link>
              <Link href="/new" className="btn btn-primary">
                <PlusIcon />
                افزودن اثر
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn btn-ghost">
              ورود
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
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

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.6l1.5 2.3 2.7-.5.6 2.7 2.4 1.4-1.4 2.4 1.4 2.4-2.4 1.4-.6 2.7-2.7-.5L12 21.4l-1.5-2.3-2.7.5-.6-2.7L4.8 15.5l1.4-2.4-1.4-2.4 2.4-1.4.6-2.7 2.7.5L12 2.6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
