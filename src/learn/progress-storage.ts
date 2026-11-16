import { z } from 'zod';
import { createKeyValue, type KeyValue } from '@/storage/key-value';

/** Where the browser keeps the quiz results (spec 4). */
export const PROGRESS_KEY = 'computable.progress';

/** One lesson's quiz result. */
export interface LessonResult {
  /** The best score, in right answers. */
  best: number;
  /** The number of questions in the quiz. */
  total: number;
  /** When the last quiz ended, as an ISO 8601 date and time. */
  finishedAt: string;
}

/** The quiz results, by lesson slug. */
export type Progress = Readonly<Record<string, LessonResult>>;

const resultSchema = z
  .strictObject({ best: z.int().nonnegative(), total: z.int().positive(), finishedAt: z.iso.datetime() })
  .refine((result) => result.best <= result.total);
const progressSchema = z.record(z.string(), resultSchema);

/** Reads saved progress. Data that does not parse reads as no progress, so it never breaks a page (spec 4). */
export function parseProgress(text: string | null): Progress {
  if (text === null) return {};
  try {
    const result = progressSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

/**
 * Adds a finished quiz to the progress. A quiz with another number of questions is a new quiz, so
 * its score replaces the old best: 4 of 4 is not better than 4 of 5.
 */
function withResult(progress: Progress, slug: string, score: number, total: number, finishedAt: Date): Progress {
  const before = progress[slug];
  const best = before !== undefined && before.total === total ? Math.max(before.best, score) : score;
  return { ...progress, [slug]: { best, total, finishedAt: finishedAt.toISOString() } };
}

/**
 * Where the quiz results live (spec 4). It follows MachineStorage: accounts in R5 can sit behind
 * the same interface.
 */
export interface ProgressStorage {
  /** False when the browser blocks storage. The results then live in memory until the tab closes. */
  readonly persistent: boolean;
  load(): Progress;
  /** Records a finished quiz and returns the new progress. */
  saveResult(slug: string, score: number, total: number, finishedAt: Date): Progress;
  /** Forgets every quiz result ("Reset my progress"). */
  reset(): void;
}

function createProgressStorage(values: KeyValue): ProgressStorage {
  const load = () => parseProgress(values.read(PROGRESS_KEY));
  return {
    get persistent() {
      return values.persistent;
    },
    load,
    saveResult(slug, score, total, finishedAt) {
      const next = withResult(load(), slug, score, total, finishedAt);
      values.write(PROGRESS_KEY, JSON.stringify(next));
      return next;
    },
    reset() {
      values.remove(PROGRESS_KEY);
    },
  };
}

/** Progress in the browser's localStorage, with an in-memory fallback. */
export function createBrowserProgressStorage(getStorage: () => Storage = () => window.localStorage): ProgressStorage {
  return createProgressStorage(createKeyValue(getStorage));
}
