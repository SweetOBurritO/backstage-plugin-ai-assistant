import express from 'express';
import Router from 'express-promise-router';
import z from 'zod';
import { validation } from './middleware/validation';
import { 
  DatabaseService, 
  HttpAuthService, 
  UserInfoService,
  RootConfigService, 
  LoggerService
} from '@backstage/backend-plugin-api';
import { createSummarizerService } from '../summarizer';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

/**
 * Preprocess content for summarization to ensure optimal performance
 */
function preprocessContentForSummarization(content: string): string {
  // Remove excessive whitespace and normalize line endings
  let processed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove repeated whitespace patterns
  processed = processed.replace(/[ \t]{2,}/g, ' ');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // If content is still very large, focus on the most important parts
  if (processed.length > 40000) {
    const lines = processed.split('\n');
    const importantLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip very short lines, repeated content, or obvious noise
      if (trimmed.length > 10 && 
          !trimmed.match(/^[^\w]*$/) && 
          !importantLines.some(existing => 
            existing.toLowerCase().includes(trimmed.toLowerCase().substring(0, 50))
          )) {
        importantLines.push(line);
      }
      
      // Stop if we have enough content
      if (importantLines.join('\n').length > 35000) {
        break;
      }
    }
    
    processed = importantLines.join('\n');
  }
  
  return processed;
}

export type PageSummaryRouterOptions = {
  database: DatabaseService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  config: RootConfigService;
  logger: LoggerService;
  models: Model[];
  langfuseEnabled: boolean;
};

export async function createPageSummaryRouter(
  options: PageSummaryRouterOptions,
): Promise<express.Router> {
  const { httpAuth, userInfo, config, models, langfuseEnabled, logger } = options;
  const router = Router();

  const summarizer = await createSummarizerService({
    config,
    models,
    langfuseEnabled,
    logger
  });

  const pageSummarySchema = z.object({
    pageContent: z.string().describe('The HTML/text content of the page to summarize'),
    pageUrl: z.string().optional().describe('The URL of the page'),
    pageTitle: z.string().optional().describe('The title of the page'),
    summaryLength: z.string().optional().describe('Desired summary length instruction'),
  });

  router.post(
    '/summarize',
    validation(pageSummarySchema, 'body'),
    async (req, res) => {
      try {
        const { pageContent, pageUrl, pageTitle, summaryLength } = req.body;

        // Set a longer timeout for this endpoint (2 minutes)
        req.setTimeout(120000, () => {
          console.error('Request timeout for page summary');
          if (!res.headersSent) {
            res.status(504).json({
              success: false,
              error: 'Request timeout - summarization took too long',
            });
          }
        });

        // Authenticate the request
        const credentials = await httpAuth.credentials(req);
        const { userEntityRef } = await userInfo.getUserInfo(credentials);

        logger.info(`Page summary request from user: ${userEntityRef}`);
        logger.info(`Page URL: ${pageUrl || 'N/A'}`);
        logger.info(`Page Title: ${pageTitle || 'N/A'}`);
        logger.info(`Content length: ${pageContent.length} characters`);

        // Preprocess and check content length
        const maxContentLength = 50000; // 50k characters
        let processedContent = preprocessContentForSummarization(pageContent);
        
        if (processedContent.length > maxContentLength) {
          logger.info(`Content too large (${processedContent.length} chars), truncating to ${maxContentLength} chars`);
          processedContent = `${processedContent.substring(0, maxContentLength)}\n\n[Content truncated due to length]`;
        }
        
        logger.info(`Content preprocessing: ${pageContent.length} -> ${processedContent.length} chars`);

        // Add timeout protection for the summarization call
        const summaryPromise = summarizer.summarizePage(
          processedContent,
          pageUrl,
          pageTitle,
          summaryLength || 'in 2-3 sentences'
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Summarization timeout')), 90000); // 90 seconds
        });

        const summary = await Promise.race([summaryPromise, timeoutPromise]);

        res.json({
          success: true,
          summary,
          originalContentLength: pageContent.length,
          processedContentLength: processedContent.length,
          contentTruncated: pageContent.length > maxContentLength,
          pageUrl,
          pageTitle,
        });
      } catch (error) {
        console.error('Error generating page summary:', error);
        
        if (!res.headersSent) {
          if (error instanceof Error && error.message.includes('timeout')) {
            res.status(504).json({
              success: false,
              error: 'Summarization request timed out. Please try with shorter content.',
            });
          } else {
            res.status(500).json({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }
  );

  return router;
}
