import type { SearchReport, SearchRequest } from './search-messages';

/** Starts a search and returns the function that stops it. The lab takes another one in tests. */
export type SearchRunner = (request: SearchRequest, onReport: (report: SearchReport) => void) => () => void;

/** Runs the search in a Web Worker. Stopping ends the worker at once. */
export const workerSearch: SearchRunner = (request, onReport) => {
  const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<SearchReport>) => onReport(event.data);
  worker.postMessage(request);
  return () => worker.terminate();
};
