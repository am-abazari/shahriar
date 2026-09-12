/*
 * سرویس‌ورکر شهریار.
 *
 * سه قاعده که بقیه از آن‌ها می‌آید:
 *  ۱. به فایل صوتی دست نمی‌زنیم. پخش با درخواست Range انجام می‌شود و هر
 *     میانجی‌گری در آن، جابه‌جایی روی نوار پخش را خراب می‌کند.
 *  ۲. مسیرهای API هرگز کش نمی‌شوند؛ فهرست آثار باید تازه باشد.
 *  ۳. دارایی‌های ساخته‌شده‌ی نکست تغییرناپذیرند و با هش نام‌گذاری می‌شوند،
 *     پس اول از کش خوانده می‌شوند.
 */

const VERSION = "v1";
const SHELL = `shahriar-shell-${VERSION}`;
const RUNTIME = `shahriar-runtime-${VERSION}`;

const PRECACHE = [
  "/offline.html",
  "/logo.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // اگر یکی از فایل‌ها نبود، کل نصب نباید شکست بخورد.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL && key !== RUNTIME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // صوت و هر درخواست بازه‌ای: بی‌واسطه به شبکه.
  if (url.pathname.startsWith("/api/files/") || request.headers.has("range")) return;

  // بقیه‌ی API: فقط شبکه، بدون کش.
  if (url.pathname.startsWith("/api/")) return;

  // دارایی‌های هش‌دار: کش اول.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // پیمایش صفحه: شبکه اول، و در نبود آن آخرین نسخه‌ی کش‌شده یا صفحه‌ی آفلاین.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // تصویر، فونت، آیکون.
  if (["image", "font", "style", "script"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached ?? network;
}
