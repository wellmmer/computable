import { parseMachine, serializeMachine } from '@/engines/turing';
import type { LessonResult, Progress } from '@/learn/progress-storage';

/**
 * The canonical text of a machine, or null when the text is missing or unreadable. The database
 * keeps the machine as jsonb, which does not keep the key order. So the sync compares these texts,
 * never the raw JSON.
 */
export function canonicalMachine(text: string | null): string | null {
  if (text === null) return null;
  const result = parseMachine(text);
  return result.ok ? serializeMachine(result.machine) : null;
}

/** True when `a` ended after `b`. */
function endedLater(a: LessonResult, b: LessonResult): boolean {
  return Date.parse(a.finishedAt) > Date.parse(b.finishedAt);
}

/**
 * Merges 2 results of one lesson. With the same number of questions, the higher best wins, with
 * the later time. A quiz with another number of questions is a new quiz, so the later result wins.
 * On the same time, the browser result stays.
 */
function mergeResult(browser: LessonResult, saved: LessonResult): LessonResult {
  if (browser.total !== saved.total) return endedLater(saved, browser) ? saved : browser;
  const finishedAt = endedLater(saved, browser) ? saved.finishedAt : browser.finishedAt;
  return { best: Math.max(browser.best, saved.best), total: browser.total, finishedAt };
}

/** Merges the browser's quiz scores with the saved ones (spec R5b 5). Lessons on one side only stay. */
export function mergeProgress(browser: Progress, saved: Progress): Progress {
  const merged: Record<string, LessonResult> = { ...saved, ...browser };
  for (const [slug, result] of Object.entries(saved)) {
    const mine = browser[slug];
    if (mine !== undefined) merged[slug] = mergeResult(mine, result);
  }
  return merged;
}

/** True when both hold the same results. The order of the lessons does not matter. */
export function sameProgress(a: Progress, b: Progress): boolean {
  const slugs = Object.keys(a);
  if (slugs.length !== Object.keys(b).length) return false;
  return slugs.every((slug) => {
    const other = b[slug];
    const mine = a[slug];
    return other !== undefined && other.best === mine.best && other.total === mine.total && other.finishedAt === mine.finishedAt;
  });
}

/** What the sync does with the machine when a page loads while the person is signed in. */
export type MachineDecision = 'nothing' | 'record' | 'take-saved' | 'upload-browser' | 'ask';

/**
 * Decides what happens to the machine on page load (spec R5b 5). All 3 inputs are canonical texts or
 * null. `lastSynced` is the machine this browser last synced for this login. A machine "changed"
 * when it differs from it.
 */
export function decideMachine(browser: string | null, saved: string | null, lastSynced: string | null): MachineDecision {
  if (saved === null) return browser === null || browser === lastSynced ? 'nothing' : 'upload-browser';
  if (browser === saved) return 'record';
  if (browser === null || browser === lastSynced) return 'take-saved';
  if (saved === lastSynced) return 'upload-browser';
  return 'ask';
}
