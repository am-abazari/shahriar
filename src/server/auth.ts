import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { getSetting, putSetting } from "./db/settings";

export interface AdminCredential {
  username: string;
  /** «scrypt$<salt hex>$<hash hex>» */
  passwordHash: string;
  updatedAt: string;
}

export const SESSION_COOKIE = "shahriar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

/* ————————————————— رمز ————————————————— */

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  // مقایسه‌ی زمان‌ثابت تا طول تطابق، اطلاعاتی درباره‌ی رمز لو ندهد.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/* ————————————————— رمزنگاری اعتبارنامه ————————————————— */

const SETTINGS_KEY = "admin_credential";

/**
 * اعتبارنامه پیش از رفتن به دیتابیس رمز می‌شود.
 * هش رمز به‌تنهایی هم نباید در دسترس باشد؛ اگر روزی نسخه‌ای از دیتابیس بیرون
 * برود، بدون کلیدِ سمت‌سرور چیزی از آن در نمی‌آید.
 */
function encryptionKey(): Buffer {
  const material = process.env.AUTH_SECRET || "shahriar-local-development";
  return scryptSync(material, "shahriar.admin.v1", 32);
}

function seal(credential: AdminCredential): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(credential), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

function open(sealed: string): AdminCredential | null {
  const [version, ivPart, tagPart, bodyPart] = sealed.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !bodyPart) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(bodyPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plain) as AdminCredential;
  } catch {
    // کلید عوض شده یا داده دستکاری شده است؛ به رمزِ محیطی برمی‌گردیم.
    return null;
  }
}

async function storedAdmin(): Promise<AdminCredential | null> {
  try {
    const sealed = await getSetting(SETTINGS_KEY);
    return sealed ? open(sealed) : null;
  } catch {
    // اگر دیتابیس در دسترس نباشد به رمزِ محیطی تکیه می‌کنیم.
    return null;
  }
}

/* ————————————————— هویت ادمین ————————————————— */

/**
 * اعتبارنامه‌ی ادمین از فضای ذخیره‌سازی خوانده می‌شود؛ اگر کاربر رمز را
 * از داخل برنامه عوض کرده باشد همان ملاک است، وگرنه به متغیرهای محیطی برمی‌گردیم.
 */
export async function getAdmin(): Promise<AdminCredential | null> {
  const stored = await storedAdmin();
  if (stored?.passwordHash) return stored;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;

  return {
    username: process.env.ADMIN_USERNAME?.trim() || "admin",
    passwordHash: hashPassword(password),
    updatedAt: "env",
  };
}

/** آیا رمزِ در حال استفاده از متغیر محیطی می‌آید یا داخل برنامه تنظیم شده؟ */
export async function isUsingEnvPassword(): Promise<boolean> {
  const stored = await storedAdmin();
  return !stored?.passwordHash;
}

export async function checkCredentials(
  username: string,
  password: string,
): Promise<AdminCredential | null> {
  const admin = await getAdmin();
  if (!admin) return null;

  // متغیر محیطی هر بار هش تازه می‌سازد، پس باید مستقیم با خودِ رمز سنجیده شود.
  const envPassword = process.env.ADMIN_PASSWORD;
  const passwordOk =
    admin.updatedAt === "env" && envPassword
      ? safeEqualString(password.normalize("NFKC"), envPassword.normalize("NFKC"))
      : verifyPassword(password, admin.passwordHash);

  const usernameOk = safeEqualString(
    username.trim().toLowerCase(),
    admin.username.trim().toLowerCase(),
  );

  return usernameOk && passwordOk ? admin : null;
}

export async function saveAdmin(username: string, password: string): Promise<AdminCredential> {
  const credential: AdminCredential = {
    username: username.trim(),
    passwordHash: hashPassword(password),
    updatedAt: new Date().toISOString(),
  };
  await putSetting(SETTINGS_KEY, seal(credential));
  return credential;
}

/* ————————————————— نشست ————————————————— */

/**
 * کلید امضا. اگر AUTH_SECRET تنظیم نشده باشد از خود رمز مشتق می‌شود؛
 * در آن حالت تغییر رمز همه‌ی نشست‌های باز را باطل می‌کند، که رفتار درستی است.
 */
function sessionSecret(admin: AdminCredential): string {
  return process.env.AUTH_SECRET || `${admin.username}:${admin.passwordHash}`;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createSessionToken(admin: AdminCredential): Promise<string> {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${admin.username}.${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload, sessionSecret(admin))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const admin = await getAdmin();
  if (!admin) return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return false;
  }

  const expected = sign(payload, sessionSecret(admin));
  if (!safeEqualString(signature, expected)) return false;

  const [username, expires] = payload.split(".");
  if (username !== admin.username) return false;
  return Number(expires) > Date.now();
}

export function sessionCookie(token: string): string {
  return serializeCookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS);
}

export function clearedSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE, "", 0);
}

function serializeCookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** خواندن یک کوکی از هدر خام، بدون افزودن وابستگی. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

function safeEqualString(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
