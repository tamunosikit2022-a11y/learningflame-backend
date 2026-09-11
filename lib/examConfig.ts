// The Learning Flame — exam configuration
// Single source of truth for subjects, structure, and marks.

export const STREAM_SUBJECTS = {
  SCIENCE: ["Mathematics", "Physics", "Chemistry", "Biology", "Agricultural Science"],
  ARTS: ["Literature-in-English", "Government", "CRS", "History", "Geography"],
  COMMERCIAL: ["Commerce", "Financial Accounting", "Economics", "Insurance", "Government"],
} as const;

export type Stream = keyof typeof STREAM_SUBJECTS;

export const COMPULSORY_SUBJECT = "English Language";

export const QUESTIONS_PER_SUBJECT = 40;
export const QUESTIONS_ENGLISH = 60;
export const TOTAL_QUESTIONS =
  QUESTIONS_ENGLISH + QUESTIONS_PER_SUBJECT * 3; // 180

export const MARKS_PER_SUBJECT = 100; // English + 3 chosen = 400 total
export const TOTAL_MARKS = MARKS_PER_SUBJECT * 4; // 400

export const MAX_ATTEMPTS = 2;
export const ATTEMPT_DURATION_MINUTES = 120; // 2 hours

// Exam-day window (server local time — set the deployment's TZ to Africa/Lagos)
export const EXAM_OPEN_HOUR = 12; // 12:00 PM
export const EXAM_CLOSE_HOUR = 18; // 6:00 PM — no new starts after this
export const RESULTS_VISIBLE_HOUR = 18;
export const RESULTS_VISIBLE_MINUTE = 10; // 6:10 PM — corrections review opens

export function isValidSubjectChoice(stream: Stream, subjects: string[]): boolean {
  if (subjects.length !== 3) return false;
  if (new Set(subjects).size !== 3) return false; // no duplicates
  const pool = STREAM_SUBJECTS[stream];
  return subjects.every((s) => (pool as readonly string[]).includes(s));
}
