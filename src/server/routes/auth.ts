import { Router } from "express";
import {
  SESSION_COOKIE,
  checkCredentials,
  clearedSessionCookie,
  createSessionToken,
  getAdmin,
  isUsingEnvPassword,
  readCookie,
  saveAdmin,
  sessionCookie,
  verifySessionToken,
} from "../auth";
import { loginSchema, passwordChangeSchema } from "../validation";

export const authRouter: Router = Router();

/** آیا درخواست از سوی ادمینِ واردشده است؟ */
export async function isAdminRequest(req: {
  headers: { cookie?: string };
}): Promise<boolean> {
  return verifySessionToken(readCookie(req.headers.cookie, SESSION_COOKIE));
}

authRouter.get("/me", async (req, res) => {
  const admin = await isAdminRequest(req);
  res.json({
    admin,
    username: admin ? (await getAdmin())?.username ?? null : null,
    usingEnvPassword: admin ? await isUsingEnvPassword() : false,
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "نام کاربری و رمز را کامل وارد کنید." });
    return;
  }

  const admin = await getAdmin();
  if (!admin) {
    res.status(503).json({
      error: "هنوز هیچ ادمینی تعریف نشده است. متغیر ADMIN_PASSWORD را تنظیم کنید.",
    });
    return;
  }

  const matched = await checkCredentials(parsed.data.username, parsed.data.password);
  if (!matched) {
    // پیام یکسان برای نام کاربری و رمزِ نادرست، تا وجود یک نام لو نرود.
    res.status(401).json({ error: "نام کاربری یا رمز درست نیست." });
    return;
  }

  res.setHeader("Set-Cookie", sessionCookie(await createSessionToken(matched)));
  res.json({ ok: true, username: matched.username });
});

authRouter.post("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", clearedSessionCookie());
  res.json({ ok: true });
});

authRouter.post("/password", async (req, res) => {
  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "برای این کار باید وارد شده باشید." });
    return;
  }

  const parsed = passwordChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "داده‌های ارسالی معتبر نیست.",
    });
    return;
  }

  const admin = await getAdmin();
  if (!admin) {
    res.status(503).json({ error: "ادمینی تعریف نشده است." });
    return;
  }

  const matched = await checkCredentials(admin.username, parsed.data.currentPassword);
  if (!matched) {
    res.status(401).json({ error: "رمز فعلی درست نیست." });
    return;
  }

  const updated = await saveAdmin(parsed.data.username, parsed.data.newPassword);
  // کلید امضای نشست از رمز مشتق می‌شود، پس باید کوکی تازه صادر شود.
  res.setHeader("Set-Cookie", sessionCookie(await createSessionToken(updated)));
  res.json({ ok: true, username: updated.username });
});
