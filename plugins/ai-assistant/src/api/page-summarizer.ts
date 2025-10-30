import { createApiRef } from '@backstage/core-plugin-api';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

export interface PageSummaryResponse {
  success: boolean;
  summary?: string;
  originalContentLength?: number;
  pageUrl?: string;
  pageTitle?: string;
  error?: string;
}

export interface PageSummaryRequest {
  pageContent: string;
  pageUrl?: string;
  pageTitle?: string;
  summaryLength?: string;
}

export interface PageContent {
  content: string;
  title: string;
  url: string;
}

export type PageSummarizationApi = {
  summarizePage: (request: PageSummaryRequest) => Promise<PageSummaryResponse>;
  summarizeCurrentPage: () => Promise<PageSummaryResponse | null>;
  extractPageContent: () => PageContent;
  isContentMeaningful: (content: string) => boolean;
  shouldSkipCurrentPage: () => boolean;
  checkRateLimit: (url: string) => boolean;
  updateRateLimit: (url: string) => void;
};

type PageSummarizationApiOptions = {
  fetchApi: FetchApi;
  discoveryApi: DiscoveryApi;
};

export const pageSummarizationApiRef = createApiRef<PageSummarizationApi>({
  id: 'plugin.ai-assistant.page-summarization',
});

export const createPageSummarizationService = ({
  fetchApi,
  discoveryApi,
}: PageSummarizationApiOptions): PageSummarizationApi => {
  
  const summarizePage = async (request: PageSummaryRequest): Promise<PageSummaryResponse> => {
    try {
      const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');
      const url = `${baseUrl}/page-summary/summarize`;
      
      const response = await fetchApi.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageContent: request.pageContent,
          pageUrl: request.pageUrl,
          pageTitle: request.pageTitle,
          summaryLength: request.summaryLength || 'in 2-3 sentences',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: PageSummaryResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling page summarization API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  const extractPageContent = (): PageContent => {
    const title = document.title || '';
    const url = window.location.href;
    
    // Get the main content area, try different selectors
    let contentElement = 
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('.content') ||
      document.querySelector('#content') ||
      document.querySelector('.main-content') ||
      document.body;

    if (!contentElement) {
      contentElement = document.body;
    }

    // Just get the HTML content - let backend handle cleaning
    const content = contentElement.innerHTML;

    return {
      content,
      title,
      url
    };
  };

  const isContentMeaningful = (content: string): boolean => {
    // Remove HTML tags and whitespace to get rough text length
    const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    // Require at least 200 characters of text content
    return textContent.length >= 200;
  };

  const shouldSkipCurrentPage = (): boolean => {
    const pathname = window.location.pathname;
    
    // Skip certain pages that don't need summarization
    const skipPatterns = [
      '/chat',           // AI assistant chat page
    //   '/ai-assistant',   // AI assistant page itself
      '/settings',       // User settings
      '/search',         // Search results (dynamic)
      '/api-docs',       // API documentation (already structured)
    ];

    return skipPatterns.some(pattern => pathname.startsWith(pattern));
  };

  const checkRateLimit = (url: string): boolean => {
    const now = Date.now();
    const lastSummaryKey = `page-summary-${url}`;
    const lastSummaryTime = localStorage.getItem(lastSummaryKey);
    
    if (lastSummaryTime) {
      const timeDiff = now - parseInt(lastSummaryTime, 10);
      // Don't summarize the same page more than once per minute
      if (timeDiff < 60000) {
        return false;
      }
    }
    
    return true;
  };

  const updateRateLimit = (url: string): void => {
    const lastSummaryKey = `page-summary-${url}`;
    localStorage.setItem(lastSummaryKey, Date.now().toString());
  };

  const summarizeCurrentPage = async (): Promise<PageSummaryResponse | null> => {
    // Check if we should skip this page
    if (shouldSkipCurrentPage()) {
      return null;
    }

    const { content, title, url } = extractPageContent();
    
    // Check if content is meaningful enough to summarize
    if (!isContentMeaningful(content)) {
      console.debug('[Page Summary] Skipping page - content not meaningful enough');
      return null;
    }

    console.debug('[Page Summary] Extracting content for:', title);
    console.debug('[Page Summary] Content length:', content.length, 'characters');
    
    // Rate limiting check
    if (!checkRateLimit(url)) {
      console.debug('[Page Summary] Skipping page due to rate limiting');
      return null;
    }

    const result = await summarizePage({
      pageContent: content,
      pageUrl: url,
      pageTitle: title,
      summaryLength: 'in 2-3 sentences',
    });

    if (result.success && result.summary) {
      console.debug('[Page Summary] ✅ Generated summary for:', title);
      console.debug('[Page Summary] Summary:', result.summary);
      
      // Store the timestamp for rate limiting
      updateRateLimit(url);
    } else {
      console.error('[Page Summary] ❌ Failed to generate summary:', result.error);
    }

    return result;
  };

  return { 
    summarizePage, 
    summarizeCurrentPage, 
    extractPageContent,
    isContentMeaningful,
    shouldSkipCurrentPage,
    checkRateLimit,
    updateRateLimit,
  };
};
