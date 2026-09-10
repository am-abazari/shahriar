import { neon } from "@neondatabase/serverless";

/**
 * لایه‌ی دسترسی به پستگرس با دو پشتوانه:
 *
 *  • با DATABASE_URL از درایور HTTP نئون استفاده می‌شود. روی توابع بدون‌سرور
 *    بهترین انتخاب است، چون هر پرس‌وجو یک درخواست مستقل است و استخر اتصالی
 *    برای نگه‌داشتن یا ته‌کشیدن وجود ندارد.
 *
 *  • بدون DATABASE_URL یک پستگرسِ درون‌فرایندی (PGlite) روی دیسک محلی بالا
 *    می‌آید تا اجرای توسعه‌ای به هیچ سرویس بیرونی نیاز نداشته باشد. این مسیر
 *    هرگز در پروداکشن اجرا نمی‌شود.
 */

type Rows = Record<string, unknown>[];
type Driver = (text: string, params: unknown[]) => Promise<Rows>;

export function databaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

/** آیا پایگاه داده‌ی راه‌دور پیکربندی شده است؟ */
export function hasDatabase(): boolean {
  return databaseUrl() !== null || allowLocalFallback();
}

/** پشتوانه‌ی محلی فقط بیرون از پروداکشن مجاز است. */
function allowLocalFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * درایور و طرح جدول‌ها روی globalThis نگه داشته می‌شوند، نه در دامنه‌ی ماژول.
 * در Next مسیرهای app و pages گراف ماژول جداگانه دارند و همین فایل دو بار
 * ارزیابی می‌شود؛ بدون این اشتراک، حالت توسعه دو نمونه‌ی مجزای پستگرسِ محلی
 * می‌ساخت و نوشته‌های یکی برای دیگری نامرئی می‌ماند. بارگذاری دوباره‌ی داغ هم
 * به همین شکل مهار می‌شود.
 */
interface DbGlobal {
  driver?: Promise<Driver> | null;
  schema?: Promise<void> | null;
}

const dbGlobal = globalThis as typeof globalThis & { __shahriarDb?: DbGlobal };
dbGlobal.__shahriarDb ??= {};
const shared = dbGlobal.__shahriarDb;

function createDriver(): Promise<Driver> {
  const url = databaseUrl();

  if (url) {
    const client = neon(url);
    return Promise.resolve(async (text, params) => (await client.query(text, params)) as Rows);
  }

  if (!allowLocalFallback()) {
    return Promise.reject(
      new Error("نشانی دیتابیس تنظیم نشده است. متغیر DATABASE_URL را در محیط اجرا قرار دهید."),
    );
  }

  return (async () => {
    const [{ PGlite }, { mkdirSync }, path] = await Promise.all([
      import("@electric-sql/pglite"),
      import("node:fs"),
      import("node:path"),
    ]);

    // PGlite پوشه‌ی تودرتو را خودش نمی‌سازد؛ در یک نسخه‌ی تازه‌ی مخزن وجود ندارد.
    const dir = path.join(process.cwd(), ".data", "pg");
    mkdirSync(dir, { recursive: true });

    const local = new PGlite(dir);
    await local.waitReady;
    console.warn(`[shahriar] DATABASE_URL تنظیم نشده؛ از پستگرس محلی در ${dir} استفاده می‌شود.`);
    return async (text, params) => {
      const result = await local.query(text, params as unknown[]);
      return result.rows as Rows;
    };
  })();
}

function getDriver(): Promise<Driver> {
  if (!shared.driver) {
    shared.driver = createDriver().catch((error) => {
      // در صورت شکست، فراخوانی بعدی دوباره تلاش می‌کند.
      shared.driver = null;
      throw error;
    });
  }
  return shared.driver;
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

/**
 * جدول‌ها در نخستین پرس‌وجوی هر نمونه ساخته می‌شوند.
 * نتیجه در سطح ماژول کش می‌شود تا در فراخوانی‌های گرمِ بعدی تکرار نشود.
 */
export function ensureSchema(): Promise<void> {
  if (!shared.schema) {
    shared.schema = (async () => {
      const run = await getDriver();
      for (const statement of STATEMENTS) {
        await run(statement, []);
      }
    })().catch((error) => {
      // در صورت شکست، دفعه‌ی بعد دوباره تلاش می‌کنیم.
      shared.schema = null;
      throw error;
    });
  }
  return shared.schema;
}

/** اجرای پرس‌وجو پس از اطمینان از وجود جدول‌ها. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const run = await getDriver();
  const rows = await run(text, params);
  return rows as T[];
}
