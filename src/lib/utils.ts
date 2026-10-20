import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeIso(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toTimeString().split(" ")[0];
  } catch {
    return isoString;
  }
}

/**
 * Deterministic control-room clock (IST, UTC+05:30).
 *
 * The replay must render identically on the server and in the browser.
 * `toLocaleTimeString` is locale/timezone dependent and produced a hydration
 * mismatch (lowercase `am` server-side vs uppercase `AM` client-side), so the
 * replay clock is formatted with fixed arithmetic instead.
 */
export function formatReplayTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const mm = String(ist.getUTCMinutes()).padStart(2, "0");
  const ss = String(ist.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
