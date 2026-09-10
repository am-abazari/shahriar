import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * درایور HTTP نئون روی توابع بدون‌سرور بهترین انتخاب است: هر پرس‌وجو یک درخواست
 * مستقل است، پس هیچ استخر اتصالی برای نگه‌داشتن یا ته‌کشیدن وجود ندارد.
 */
let client: NeonQueryFunction<false, false> | null = null;

export function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      "نشانی دیتابیس تنظیم نشده است. متغیر DATABASE_URL را در محیط اجرا قرار دهید.",
    );
  }
  return url;
}

export function hasDatabase(): boolean {
  try {
    connectionString();
    return true;
  } catch {
    return false;
  }
}

export function sql(): NeonQueryFunction<false, false> {
  if (!client) client = neon(connectionString());
  return client;
}

/* ————————————————— ساخت جدول‌ها ————————————————— */

const STATEMENTS = [
  `create table if not exists audio_files (
     id          text primary key,
     name        text        not null default '',
     mime        text        not null default '',
     size        bigint      not null default 0,
     complete    boolean     not null default false,
     created_at  timestamptz not null default now()
   )`,

  // صوت در ردیف‌های کوچک نگهداری می‌شود تا پاسخ به درخواست Range
  // فقط همان بخش لازم را از دیتابیس بخواند، نه کل فایل را.
  `create table if not exists audio_chunks (
     audio_id text not null references audio_files(id) on delete cascade,
     idx      int  not null,
     bytes    bytea not null,
     primary key (audio_id, idx)
   )`,

  `create table if not exists pieces (
     id          text primary key,
     title       text        not null,
     poet        text        not null default '',
     note        text        not null default '',
     form        text        not null default 'ghazal',
     accent      text        not null default 'amber',
     audio_id    text        references audio_files(id) on delete set null,
     audio_name  text        not null default '',
     audio_type  text        not null default '',
     audio_size  bigint      not null default 0,
     duration    double precision not null default 0,
     segments    jsonb       not null default '[]'::jsonb,
     created_at  timestamptz not null default now(),
     updated_at  timestamptz not null default now()
   )`,

  `create index if not exists pieces_created_at_idx on pieces (created_at desc)`,

  `create table if not exists app_settings (
     key        text primary key,
     value      text        not null,
     updated_at timestamptz not null default now()
   )`,
];

let schemaReady: Promise<void> | null = null;

/**
 * جدول‌ها در نخستین پرس‌وجوی هر نمونه ساخته می‌شوند.
 * نتیجه در سطح ماژول کش می‌شود تا در فراخوانی‌های گرمِ بعدی تکرار نشود.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = sql();
      for (const statement of STATEMENTS) {
        await db.query(statement);
      }
    })().catch((error) => {
      // در صورت شکست، دفعه‌ی بعد دوباره تلاش می‌کنیم.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/** اجرای پرس‌وجو پس از اطمینان از وجود جدول‌ها. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const rows = await sql().query(text, params);
  return rows as T[];
}
