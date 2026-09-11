import {
  ATTEMPT_DURATION_MINUTES,
  EXAM_CLOSE_HOUR,
  EXAM_OPEN_HOUR,
  RESULTS_VISIBLE_HOUR,
  RESULTS_VISIBLE_MINUTE,
} from "./examConfig";

// IMPORTANT: set the deployment's TZ env var to "Africa/Lagos" on Vercel so
// `new Date()` hour math below matches Nigerian exam-day time, not UTC.

export function canStartNewAttempt(now: Date = new Date()): boolean {
  const hour = now.getHours();
  return hour >= EXAM_OPEN_HOUR && hour < EXAM_CLOSE_HOUR;
}

export function examWindowLabel(now: Date = new Date()): "NOT_OPEN_YET" | "OPEN" | "CLOSED" {
  const hour = now.getHours();
  if (hour < EXAM_OPEN_HOUR) return "NOT_OPEN_YET";
  if (hour >= EXAM_CLOSE_HOUR) return "CLOSED";
  return "OPEN";
}

// Once a student legitimately starts before 6:00 PM, their 2-hour clock runs
// to completion even if it crosses 6:00 PM. Only *new* starts are blocked at 6.
export function computeDeadline(startedAt: Date): Date {
  return new Date(startedAt.getTime() + ATTEMPT_DURATION_MINUTES * 60_000);
}

export function resultsAndReviewOpen(now: Date = new Date()): boolean {
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour > RESULTS_VISIBLE_HOUR) return true;
  if (hour === RESULTS_VISIBLE_HOUR && minute >= RESULTS_VISIBLE_MINUTE) return true;
  return false;
}
