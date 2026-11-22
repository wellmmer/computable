import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SearchReport } from './search-messages';
import { workerSearch } from './worker-search';

/** A stand-in for the browser's Worker. The test fires its events by hand. */
class FakeWorker {
  static last: FakeWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.last = this;
  }
}

afterEach(() => vi.unstubAllGlobals());

const REQUEST = { cipher: 'ABC', crib: 'XY', offset: 0, orders: [] };

describe('workerSearch', () => {
  it('passes the worker\'s reports to the page', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const reports: SearchReport[] = [];
    workerSearch(REQUEST, (report) => reports.push(report));
    expect(FakeWorker.last.postMessage).toHaveBeenCalledWith(REQUEST);
    FakeWorker.last.onmessage?.(new MessageEvent('message', { data: { type: 'finished' } }));
    expect(reports).toEqual([{ type: 'finished' }]);
  });

  it.each(['onerror', 'onmessageerror'] as const)('ends the worker and reports a failure on %s', (handler) => {
    vi.stubGlobal('Worker', FakeWorker);
    const reports: SearchReport[] = [];
    workerSearch(REQUEST, (report) => reports.push(report));
    const worker = FakeWorker.last;
    expect(worker[handler]).toBeTypeOf('function');
    worker[handler]?.(new MessageEvent('error'));
    expect(worker.terminate).toHaveBeenCalled();
    expect(reports).toEqual([{ type: 'failed' }]);
  });
});
