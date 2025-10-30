import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import { pageSummarizationApiRef } from '../api/page-summarizer';

/**
 * Hook that listens to navigation changes and triggers page summarization
 */
export function usePageSummarization() {
  const location = useLocation();
  const pageSummarizationApi = useApi(pageSummarizationApiRef);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for location changes
  useEffect(() => {
    // Clear any pending summarization
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    console.log('[Page Summary] Navigation detected, path:', location.pathname);

    // Wait for the page to fully render before extracting content
    // timeoutRef.current = setTimeout(async () => {
    const summarize = async () => {
      try {
        console.log('[Page Summary] Summarizing page content...');
        await pageSummarizationApi.summarizeCurrentPage();
        console.log('[Page Summary] Summarization complete.');
      } catch (error) {
        console.error('[Page Summary] Error during summarization:', error);
      }
    };
    summarize();
    // }, 2000); // Wait 2 seconds for the page to render

    // Cleanup timeout on unmount or when location changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, location.search, location.hash, pageSummarizationApi]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}