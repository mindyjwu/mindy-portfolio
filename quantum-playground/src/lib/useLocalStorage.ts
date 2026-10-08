"use client";
import { useCallback, useEffect, useState } from "react";

/** localStorage-backed state. Renders `initial` first (SSR-safe), then hydrates. Never throws. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* storage unavailable or corrupt: fall back to initial */
    }
    setReady(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
        return v;
      });
    },
    [key],
  );

  return [value, update, ready] as const;
}
