/**
 * ساخت آیکون‌های PNG از روی لوگوی برداری.
 * مانیفست PWA در کروم با SVG کنار نمی‌آید و iOS هم فقط PNG می‌پذیرد،
 * پس اندازه‌های لازم را همین‌جا از منبعِ واحد بیرون می‌کشیم.
 *
 *   npm run icons
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(process.cwd(), "public");

const TARGETS = [
  { source: "logo.svg", out: "icon-192.png", size: 192 },
  { source: "logo.svg", out: "icon-512.png", size: 512 },
  { source: "logo.svg", out: "apple-touch-icon.png", size: 180 },
  { source: "logo-maskable.svg", out: "icon-maskable-512.png", size: 512 },
];

for (const { source, out, size } of TARGETS) {
  const svg = await readFile(path.join(root, source));
  // density بالا لازم است وگرنه sharp نخست در اندازه‌ی پیش‌فرض رستر می‌کند و لبه‌ها پله‌پله می‌شوند.
  const png = await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(root, out), png);
  console.log(`${out.padEnd(24)} ${size}×${size}  ${(png.byteLength / 1024).toFixed(1)}KB`);
}
