import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle, themeBootScript } from "@/components/ThemeToggle";
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
  // نوار مرورگر با تم صفحه هم‌رنگ می‌شود.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();

  return (
    <html lang="fa" dir="rtl" className={vazir.variable} data-accent="amber" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
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
    <header className="sticky top-0 z-40 border-b border-hair/5 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex items-center gap-3">
          <img
            src="/logo.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-lg shadow-gold/20"
          />
          <span className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight">شهریار</span>
            <span className="mt-1 hidden text-[11px] text-paper-faint sm:block">شعر، هم‌زمان با صدا</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/" className="btn btn-ghost hidden sm:inline-flex">
            گنجینه
          </Link>
          <ThemeToggle />
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
