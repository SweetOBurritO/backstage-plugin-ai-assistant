/**
 * Type for the structure of search results returned by the Wikipedia API.
 */
export type SearchResults = {
  query: {
    search: Array<{
      title: string;
    }>;
  };
};

/**
 * Type for the structure of a page returned by the Wikipedia API.
 */
export type Page = {
  pageid: number;
  ns: number;
  title: string;
  extract: string;
};

/**
 * Type for the structure of a page result returned by the Wikipedia API.
 */
export type PageResult = {
  batchcomplete: string;
  query: {
    pages: Record<string, Page>;
  };
};
