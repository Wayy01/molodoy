"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/** Current time rounded to the minute; null during SSR so nothing time-based hydrates differently. */
export function useNow() {
  const minute = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
  return minute === null ? null : minute * 60_000;
}
