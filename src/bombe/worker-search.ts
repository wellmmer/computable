import type { SearchReport, SearchRequest } from './search-messages';

/** Starts a search and returns the function that stops it. The lab takes another one in tests. */
export type SearchRunner = (request: SearchRequest, onReport: (report: SearchReport) => void) => () => void;

/**
 * Runs the search in a Web Worker. Stopping ends the worker at once. If the worker cannot load or
 * run, or a report cannot be read, the worker ends and the page gets a `failed` report.
 */
export const workerSearch: SearchRunner = (request, onReport) => {
  const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
  const fail = () => {
    worker.terminate();
    onReport({ type: 'failed' });
  };
  worker.onmessage = (event: MessageEvent<SearchReport>) => onReport(event.data);
  worker.onerror = fail;
  worker.onmessageerror = fail;
  worker.postMessage(request);
  return () => worker.terminate();
};
