import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable} data-accent="amber">
      <body className="antialiased">
        <div className="aurora" aria-hidden />
        <div className="grain" aria-hidden />
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

function SiteHeader() {
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
          <Link href="/new" className="btn btn-primary">
            <PlusIcon />
            افزودن اثر
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-5 text-center text-xs text-paper-faint">
        <p>ساخته‌شده برای شعر پارسی — شهریار</p>
        <p className="opacity-70">Next.js · Express · TypeScript</p>
      </div>
    </footer>
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
