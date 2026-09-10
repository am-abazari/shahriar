import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findActiveIndex,
  parseLyricsText,
  segmentProgress,
  sortSegments,
  toLrc,
  validateSegments,
} from "../src/lib/segments";
import type { Segment } from "../src/lib/types";

const seg = (id: string, start: number, end: number, group = 0): Segment => ({
  id,
  text: id,
  start,
  end,
  group,
});

describe("اعتبارسنجی زمان‌بندی", () => {
  it("زمان‌بندی سالم هیچ ایرادی ندارد", () => {
    assert.deepEqual(validateSegments([seg("a", 0, 5), seg("b", 5, 9)]), []);
  });

  it("تداخل دو بیت را می‌گیرد", () => {
    const issues = validateSegments([seg("a", 0, 6), seg("b", 5, 9)]);
    assert.ok(issues.some((i) => i.message.includes("تداخل")));
  });

  it("پایانِ پیش از شروع را رد می‌کند", () => {
    assert.ok(validateSegments([seg("a", 8, 3)]).some((i) => i.message.includes("پایان")));
  });

  it("پایانِ بیرون از مدت فایل صوتی را رد می‌کند", () => {
    assert.ok(validateSegments([seg("a", 0, 5)], 3).some((i) => i.message.includes("مدت")));
  });
});

describe("یافتن بیت فعال", () => {
  const s = sortSegments([seg("a", 0, 5), seg("b", 5, 10), seg("c", 10, 15)]);

  it("در هر لحظه دقیقاً یک بیت فعال است", () => {
    assert.equal(findActiveIndex(s, 0), 0);
    assert.equal(findActiveIndex(s, 4.999), 0);
    assert.equal(findActiveIndex(s, 14.99), 2);
  });

  it("مرز مشترک به بیت بعدی تعلق دارد، نه به هر دو", () => {
    assert.equal(findActiveIndex(s, 5), 1);
    assert.equal(findActiveIndex(s, 10), 2);
  });

  it("بیرون از همه‌ی بیت‌ها هیچ بیتی روشن نمی‌شود", () => {
    assert.equal(findActiveIndex(s, 15), -1);
    assert.equal(findActiveIndex(sortSegments([seg("a", 0, 2), seg("b", 8, 10)]), 5), -1);
  });

  it("پیشرفت داخل بیت را درست می‌سنجد", () => {
    assert.equal(segmentProgress(seg("a", 10, 20), 15), 0.5);
    assert.equal(segmentProgress(seg("a", 10, 20), 5), 0);
    assert.equal(segmentProgress(seg("a", 10, 20), 99), 1);
  });
});

describe("خواندن متن شعر", () => {
  it("خط خالی بند تازه می‌سازد و فاصله‌های اضافی را نادیده می‌گیرد", () => {
    const parsed = parseLyricsText("بیت یک\nبیت دو\n\nبیت سه\n   \nبیت چهار");
    assert.equal(parsed.length, 4);
    assert.deepEqual(
      parsed.map((p) => p.group),
      [0, 0, 1, 2],
    );
  });
});

describe("خروجی LRC", () => {
  it("مرتب و با مهر زمانی درست ساخته می‌شود", () => {
    const lines = toLrc([seg("b", 65.5, 70), seg("a", 0, 5)]).split("\n");
    assert.equal(lines[0], "[00:00.00]a");
    assert.equal(lines[1], "[01:05.50]b");
  });
});
