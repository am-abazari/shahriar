import Link from "next/link";
import { PieceCard } from "@/components/PieceCard";
import { listPieces } from "@/server/db/pieces";
import { toPersianDigits } from "@/lib/time";
import { isAdmin } from "@/server/session";

// فهرست باید همیشه تازه باشد؛ کاربر بلافاصله پس از افزودن اثر به اینجا برمی‌گردد.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pieces, admin] = await Promise.all([listPieces(), isAdmin()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-20">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-paper-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          شعر، هم‌زمان با صدای شاعر
        </p>

        <h1 className="text-balance text-3xl font-bold leading-[1.7] sm:text-5xl sm:leading-[1.6]">
          هر بیت، دقیقاً وقتی که{" "}
          <span className="bg-gradient-to-l from-gold-soft to-gold bg-clip-text text-transparent">
            خوانده می‌شود
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-balance text-sm leading-8 text-paper-dim sm:text-base">
          صدای خواندنِ شعر را بگذارید، متن را بچسبانید و برای هر مصرع بگویید از کجا تا کجاست.
          شنونده هر مصرع را همان لحظه‌ای می‌بیند که می‌شنود.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {pieces.length > 0 && (
            <a href="#gonjine" className="btn btn-primary !px-6 !py-3">
              دیدن گنجینه ({toPersianDigits(pieces.length)})
            </a>
          )}
          {admin && (
            <Link
              href="/new"
              className={`btn !px-6 !py-3 ${pieces.length > 0 ? "btn-ghost" : "btn-primary"}`}
            >
              افزودن اثر تازه
            </Link>
          )}
        </div>
      </section>

      <section id="gonjine" className="mt-20 scroll-mt-24">
        {pieces.length === 0 ? (
          <EmptyState admin={admin} />
        ) : (
          <>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">گنجینه</h2>
              <span className="text-xs text-paper-faint">
                {toPersianDigits(pieces.length)} اثر
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pieces.map((piece) => (
                <PieceCard key={piece.id} piece={piece} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState({ admin }: { admin: boolean }) {
  return (
    <div className="glass mx-auto max-w-lg rounded-3xl p-10 text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gold/10 text-2xl">
        ✒️
      </div>
      <h2 className="text-lg font-bold">گنجینه هنوز خالی است</h2>
      <p className="mt-3 text-sm leading-7 text-paper-dim">
        {admin
          ? "نخستین غزل یا دکلمه را بیفزایید تا اینجا بنشیند."
          : "هنوز اثری منتشر نشده است. به‌زودی سر بزنید."}
      </p>
      {admin && (
        <Link href="/new" className="btn btn-primary mt-6">
          شروع کنیم
        </Link>
      )}
    </div>
  );
}
