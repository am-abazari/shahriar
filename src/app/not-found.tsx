import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60dvh] w-full max-w-md place-items-center px-5 text-center">
      <div>
        <p className="text-5xl">۴۰۴</p>
        <h1 className="mt-4 text-lg font-bold">این صفحه پیدا نشد</h1>
        <p className="mt-3 text-sm leading-7 text-paper-dim">
          شاید اثری که دنبالش هستید حذف شده باشد.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          بازگشت به گنجینه
        </Link>
      </div>
    </div>
  );
}
