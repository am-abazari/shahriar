import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

/**
 * وضعیت ادمین برای کامپوننت‌های سمت سرور.
 * صفحه‌ها بر پایه‌ی همین تصمیم می‌گیرند که دکمه‌های ویرایش را نشان بدهند یا نه؛
 * جلوگیری واقعی روی مسیرهای API انجام می‌شود، نه اینجا.
 */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
