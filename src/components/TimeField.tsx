"use client";

import { useEffect, useState } from "react";
import { formatTime, parseTime } from "@/lib/time";

interface Props {
  value: number | null;
  onCommit: (seconds: number | null) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * ورودی زمان با قالب «دقیقه:ثانیه.صدم».
 * متن تایپ‌شده تا لحظه‌ی خروج از فیلد یا زدن Enter تفسیر نمی‌شود تا
 * ویرایش نیمه‌تمام (مثلاً «1:») مقدار را خراب نکند.
 */
export function TimeField({ value, onCommit, label, invalid, disabled }: Props) {
  const [text, setText] = useState(() => (value === null ? "" : formatTime(value)));
  const [focused, setFocused] = useState(false);

  // وقتی مقدار از بیرون عوض می‌شود (مثلاً با دکمه‌ی «اکنون») و کاربر مشغول تایپ نیست.
  useEffect(() => {
    if (!focused) setText(value === null ? "" : formatTime(value));
  }, [value, focused]);

  const commit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onCommit(null);
      return;
    }
    const parsed = parseTime(trimmed);
    if (parsed === null) {
      setText(value === null ? "" : formatTime(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      dir="ltr"
      aria-label={label}
      title={label}
      placeholder="—:——"
      disabled={disabled}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={(event) => {
        setFocused(true);
        event.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setText(value === null ? "" : formatTime(value));
          event.currentTarget.blur();
        }
        // با کلیدهای بالا/پایین زمان را صدم‌ثانیه‌ای جابه‌جا می‌کنیم.
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && value !== null) {
          event.preventDefault();
          const step = event.shiftKey ? 1 : 0.1;
          onCommit(Math.max(0, value + (event.key === "ArrowUp" ? step : -step)));
        }
      }}
      className={`field !px-2 !py-1.5 text-center font-mono text-xs tabular-nums ${
        invalid ? "!border-red-400/60 !bg-red-500/5" : ""
      }`}
    />
  );
}
