import { runSearch } from './run-search';
import type { SearchReport, SearchRequest } from './search-messages';

// The search runs here, off the page's thread, so the page keeps answering while the Bombe tests.
self.onmessage = (event: MessageEvent<SearchRequest>) => {
  runSearch(event.data, (report: SearchReport) => self.postMessage(report));
};
