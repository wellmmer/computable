import { useSyncExternalStore } from 'react';
import { sharedBrowserValues } from '@/storage/synced-key-value';
import { createBrowserProgressStorage, PROGRESS_KEY, type Progress, type ProgressStorage } from './progress-storage';

// One copy per page load, shared by the quiz and the Learn page, so a finished quiz shows at once.
// A save or reset in another tab updates it through the "storage" event. Scores that the account
// sync wrote update it too (spec R5b 5).
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

/**
 * Another tab saved or reset the progress. The browser fires "storage" only in the other tabs.
 * A null key means the other tab cleared all of localStorage.
 */
function onStorage(event: StorageEvent) {
  if (event.key !== PROGRESS_KEY && event.key !== null) return;
  publish(openStorage().load());
}

/** Stops listening to the account sync. Null while no component listens. */
let stopAccountListener: (() => void) | null = null;

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('storage', onStorage);
    stopAccountListener = sharedBrowserValues().onAccountChange((key) => {
      if (key === PROGRESS_KEY) publish(openStorage().load());
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener('storage', onStorage);
    stopAccountListener?.();
    stopAccountListener = null;
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
