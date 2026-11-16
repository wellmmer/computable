import { useSyncExternalStore } from 'react';
import { createBrowserProgressStorage, type Progress, type ProgressStorage } from './progress-storage';

// One copy per page load, shared by the quiz and the Learn page, so a finished quiz shows at once.
let storage: ProgressStorage | null = null;
let snapshot: Progress | null = null;
const listeners = new Set<() => void>();

/** Opens the browser storage on first use. Only the browser calls this, never the server. */
function openStorage(): ProgressStorage {
  storage ??= createBrowserProgressStorage();
  return storage;
}

/** The same object until the progress changes, as useSyncExternalStore needs. */
function currentProgress(): Progress {
  snapshot ??= openStorage().load();
  return snapshot;
}

function publish(next: Progress) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The server cannot see the browser storage, so it renders no progress. */
function serverProgress(): null {
  return null;
}

/** Saves a finished quiz (spec 2.4). Quizzes send no analytics events (spec 4). */
export function saveQuizResult(slug: string, score: number, total: number) {
  publish(openStorage().saveResult(slug, score, total, new Date()));
}

/** "Reset my progress" on the Learn page (spec 2.1). */
export function resetProgress() {
  openStorage().reset();
  publish({});
}

/** The quiz results in this browser. Null on the server and while the page hydrates. */
export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribe, currentProgress, serverProgress);
}
