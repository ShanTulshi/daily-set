/** A solved puzzle. */
export interface Result {
  time: number // ms
  misses: number
}

/** Every solved puzzle, by date. Separate from the day's progress, which is replaced daily. */
export type History = Record<string, Result>

const HISTORY_KEY = 'daily-set-history'

export function loadHistory(): History {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

export function saveHistory(history: History) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable: stats just aren't kept.
  }
}

/** Solve times are grouped into 10-second buckets: 0–10, 10–20, …, 80–90, 90+. */
export const BUCKET_COUNT = 10

export function bucketOf(time: number): number {
  return Math.min(BUCKET_COUNT - 1, Math.floor(time / 10_000))
}

export function formatTime(elapsed: number): string {
  const ms = Math.floor(elapsed) // flooring keeps 59999.6 from rounding up to "0:60.000"
  const minutes = Math.floor(ms / 60_000)
  const seconds = ((ms % 60_000) / 1000).toFixed(3)
  return `${minutes}:${seconds.padStart(6, '0')}`
}

export const missCount = (misses: number) => `${misses} ${misses === 1 ? 'miss' : 'misses'}`
