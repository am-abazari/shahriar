import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type DraftSegment,
  clearTiming,
  draftFromText,
  draftIssues,
  draftToSegments,
  draftToText,
  setEnd,
  setStart,
  suggestStart,
  timedCount,
  upperBound,
} from "../src/lib/draft";

const row = (
  id: string,
  start: number | null,
  end: number | null,
  group = 0,
  text = id,
): DraftSegment => ({ id, text, start, end, group });

describe("پیشنهاد خودکار زمان شروع", () => {
  it("شروع بیت بعدی را از پایان بیت پیشین می‌گیرد", () => {
    assert.equal(suggestStart([row("a", 0, 4), row("b", null, null)], 1), 4);
  });

  it("از روی بیتِ هنوز زمان‌نخورده می‌پرد و به آخرین بیت زمان‌دار می‌رسد", () => {
    const draft = [row("a", 0, 4), row("b", null, null), row("c", null, null)];
    assert.equal(suggestStart(draft, 2), 4);
  });

  it("نخستین بیت از صفر آغاز می‌شود", () => {
    assert.equal(suggestStart([row("a", null, null)], 0), 0);
  });

  it("سقفِ مجاز، شروعِ نخستین بیتِ زمان‌خورده‌ی بعدی است", () => {
    const draft = [row("a", null, null), row("b", null, null), row("c", 12, 16)];
    assert.equal(upperBound(draft, 0), 12);
    assert.equal(upperBound(draft, 2), null);
  });
});

describe("زنجیر شدن پایان یک بیت به شروع بیت بعدی", () => {
  it("ثبت زمان پایان، شروع بیت بعدی را خودکار پر می‌کند", () => {
    const draft = setEnd([row("a", 0, null), row("b", null, null)], 0, 4.237);
    assert.equal(draft[0].end, 4.24, "زمان به صدم ثانیه گرد می‌شود");
    assert.equal(draft[1].start, 4.24);
  });

  it("مرز مشترک یک عدد است، پس تداخل ناممکن می‌شود", () => {
    let draft = setEnd([row("a", 0, null), row("b", null, null)], 0, 6);
    assert.equal(draft[0].end, draft[1].start, "پایانِ یکی همان شروعِ دیگری است");

    // سطر دوم را هم می‌بندیم تا زمان‌بندی کامل شود.
    draft = setEnd(draft, 1, 11);
    assert.equal(draftIssues(draft, 30).size, 0);
    assert.equal(draft[1].start, 6);
  });

  it("بیت بعدیِ زمان‌بندی‌شده‌ی جلوتر را بازنویسی نمی‌کند", () => {
    const draft = setEnd([row("a", 0, null), row("b", 20, 25)], 0, 4);
    assert.equal(draft[1].start, 20);
    assert.equal(draft[1].end, 25);
  });

  it("بیت بعدیِ عقب‌افتاده را جلو می‌کشد تا تداخل نماند", () => {
    const draft = setEnd([row("a", 0, null), row("b", 2, null)], 0, 6);
    assert.equal(draft[1].start, 6);
  });

  it("پایان را زیر کف مجاز نمی‌پذیرد", () => {
    const draft = setEnd([row("a", 5, null)], 0, 1);
    assert.ok(draft[0].end !== null && draft[0].end > 5);
  });

  it("شروع نمی‌تواند از پایان بیت پیشین عقب‌تر برود", () => {
    const draft = setStart([row("a", 0, 5), row("b", 5, 9)], 1, 3);
    assert.equal(draft[1].start, 5);
  });

  it("جابه‌جا کردن شروع به جلوی پایانِ فعلی، پایان را برای ثبت دوباره پاک می‌کند", () => {
    const draft = setStart([row("a", 0, 4)], 0, 6);
    assert.equal(draft[0].start, 6);
    assert.equal(draft[0].end, null);
  });

  it("پاک‌کردن زمان‌بندی متن را دست نمی‌زند", () => {
    const draft = clearTiming([row("a", 0, 4, 0, "بیت نخست")], 0);
    assert.equal(draft[0].start, null);
    assert.equal(draft[0].end, null);
    assert.equal(draft[0].text, "بیت نخست");
  });
});

describe("خطاهای پیش‌نویس", () => {
  it("تداخل را کنار همان سطر گزارش می‌کند", () => {
    const issues = draftIssues([row("a", 0, 6), row("b", 5, 9)], 30);
    assert.ok(issues.get("a")?.includes("تداخل"));
  });

  it("زمان‌بندی ناقص را می‌گیرد", () => {
    assert.ok(draftIssues([row("a", 0, null)], 30).get("a")?.includes("ناقص"));
  });

  it("سطرِ هنوز زمان‌نخورده خطا نیست", () => {
    assert.equal(draftIssues([row("a", null, null)], 30).size, 0);
  });

  it("سطر بی‌متن خطا دارد", () => {
    assert.ok(draftIssues([row("a", 0, 4, 0, "   ")], 30).get("a")?.includes("خالی"));
  });
});

describe("تبدیل متن و پیش‌نویس", () => {
  it("متن شعر به سطرهای بدون زمان تبدیل می‌شود", () => {
    const draft = draftFromText("بیت یک\nبیت دو\n\nبیت سه");
    assert.equal(draft.length, 3);
    assert.deepEqual(
      draft.map((d) => d.start),
      [null, null, null],
    );
    assert.deepEqual(
      draft.map((d) => d.group),
      [0, 0, 1],
    );
  });

  it("رفت‌وبرگشت متن، بندها را نگه می‌دارد", () => {
    const text = "بیت یک\nبیت دو\n\nبیت سه";
    assert.equal(draftToText(draftFromText(text)), text);
  });

  it("فقط سطرهای کاملاً زمان‌خورده ذخیره می‌شوند", () => {
    const draft = [row("a", 0, 4), row("b", null, null), row("c", 4, 8)];
    const segments = draftToSegments(draft);
    assert.equal(timedCount(draft), 2);
    assert.deepEqual(
      segments.map((s) => s.id),
      ["a", "c"],
    );
  });
});
