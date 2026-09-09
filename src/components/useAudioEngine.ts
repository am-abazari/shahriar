"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioEngine {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  playing: boolean;
  ready: boolean;
  error: string | null;
  rate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  nudge: (delta: number) => void;
  setRate: (rate: number) => void;
}

/**
 * کنترل عنصر <audio>.
 * زمان جاری با requestAnimationFrame خوانده می‌شود، نه با رویداد timeupdate:
 * مرورگرها آن رویداد را فقط هر ۲۵۰ میلی‌ثانیه می‌فرستند و برای روشن‌شدن
 * دقیقِ مصرع‌ها به‌قدر کافی نرم نیست.
 */
export function useAudioEngine(src: string | null): AudioEngine {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRateState] = useState(1);

  // حلقه‌ی نمونه‌برداری فقط در حین پخش زنده است تا در حالت مکث CPU مصرف نشود.
  useEffect(() => {
    if (!playing) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      return;
    }
    const tick = () => {
      const el = audioRef.current;
      if (el) setCurrentTime(el.currentTime);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      setReady(true);
      setError(null);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onSeeked = () => setCurrentTime(el.currentTime);
    const onError = () => {
      setError("پخش فایل صوتی ممکن نشد. شاید فرمت آن پشتیبانی نمی‌شود.");
      setReady(false);
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("durationchange", onLoaded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("durationchange", onLoaded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("error", onError);
    };
  }, [src]);

  // با عوض‌شدن فایل، وضعیت از نو شروع می‌شود.
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setReady(false);
    setPlaying(false);
    setError(null);
  }, [src]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {
      setError("مرورگر اجازه‌ی پخش خودکار نداد. دکمه‌ی پخش را بزنید.");
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) play();
    else el.pause();
  }, [play]);

  const seek = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    const max = Number.isFinite(el.duration) ? el.duration : seconds;
    const value = Math.min(Math.max(0, seconds), max);
    el.currentTime = value;
    setCurrentTime(value);
  }, []);

  const nudge = useCallback(
    (delta: number) => {
      const el = audioRef.current;
      if (el) seek(el.currentTime + delta);
    },
    [seek],
  );

  const setRate = useCallback((value: number) => {
    const el = audioRef.current;
    if (el) el.playbackRate = value;
    setRateState(value);
  }, []);

  return {
    audioRef,
    currentTime,
    duration,
    playing,
    ready,
    error,
    rate,
    play,
    pause,
    toggle,
    seek,
    nudge,
    setRate,
  };
}
