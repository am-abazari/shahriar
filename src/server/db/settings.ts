import { query } from "./client";

/**
 * جدول کلید-مقدارِ کوچک برای تنظیمات برنامه.
 * فعلاً تنها مصرفش نگهداری اعتبارنامه‌ی رمزشده‌ی ادمین است.
 */
export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    `select value from app_settings where key = $1`,
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function putSetting(key: string, value: string): Promise<void> {
  await query(
    `insert into app_settings (key, value, updated_at)
     values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, value],
  );
}
