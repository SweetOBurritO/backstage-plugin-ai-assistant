/**
 * Content cleaning utilities for processing page content before summarization
 */

/**
 * Clean page content by removing HTML markup, styling, and scripts
 * while preserving meaningful text content and structure.
 */
export function cleanPageContent(content: string): string {
  // Early return for very small content
  if (content.length < 100) {
    return content.trim();
  }

  let cleanedContent = content;

  // Remove JavaScript blocks and inline scripts (optimized for performance)
  cleanedContent = cleanedContent.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    '',
  );
  cleanedContent = cleanedContent.replace(
    /\s*on\w+\s*=\s*["'][^"']*["']/gi,
    '',
  );
  cleanedContent = cleanedContent.replace(/javascript:[^"'\s>]*/gi, '');

  // Remove CSS style blocks and inline styles
  cleanedContent = cleanedContent.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    '',
  );
  cleanedContent = cleanedContent.replace(
    /\s*style\s*=\s*["'][^"']*["']/gi,
    '',
  );
  cleanedContent = cleanedContent.replace(
    /\s*class\s*=\s*["'][^"']*["']/gi,
    '',
  );

  // Remove common noise elements early to reduce processing load
  cleanedContent = cleanedContent.replace(
    /<(nav|header|footer|aside|script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );

  // Convert HTML to structured text preserving important elements
  cleanedContent = convertHtmlToStructuredText(cleanedContent);

  // Normalize whitespace
  cleanedContent = normalizeContentWhitespace(cleanedContent);

  // Limit final content length to prevent excessive token usage
  const maxFinalLength = 30000; // 30k characters
  if (cleanedContent.length > maxFinalLength) {
    cleanedContent = `${cleanedContent.substring(
      0,
      maxFinalLength,
    )}\n\n[Content truncated for processing efficiency]`;
  }

  return cleanedContent.trim();
}

/**
 * Convert HTML to structured text preserving headings, lists, and paragraphs
 */
function convertHtmlToStructuredText(html: string): string {
  let text = html;

  // Convert headings
  text = text.replace(/<h([1-6])[^>]*>/gi, (_, level) => {
    const hashes = '#'.repeat(parseInt(level, 10));
    return `\n${hashes} `;
  });
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  // Convert paragraphs
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');

  // Convert line breaks
  text = text.replace(/<br[^>]*>/gi, '\n');

  // Convert lists
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n- ');
  text = text.replace(/<\/li>/gi, '');

  // Convert emphasis
  text = text.replace(/<(strong|b)[^>]*>/gi, '**');
  text = text.replace(/<\/(strong|b)>/gi, '**');
  text = text.replace(/<(em|i)[^>]*>/gi, '*');
  text = text.replace(/<\/(em|i)>/gi, '*');

  // Convert links (preserve URL in brackets)
  text = text.replace(/<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi, '[');
  text = text.replace(/<\/a>/gi, ']');

  // Remove remaining HTML tags
  text = stripHtmlTags(text);

  return text;
}

/**
 * Simple HTML tag removal
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace, removing excess spaces and line breaks
 */
function normalizeContentWhitespace(text: string): string {
  return (
    text
      // Replace multiple spaces with single space
      .replace(/[ \t]+/g, ' ')
      // Replace multiple line breaks with double line break (paragraph separation)
      .replace(/\n{3,}/g, '\n\n')
      // Remove spaces at the beginning and end of lines
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      // Remove empty lines that only contain whitespace
      .replace(/^\s*$/gm, '')
  );
}

/**
 * Extract meaningful text content from HTML while removing noise
 */
export function extractTextContent(html: string): string {
  let text = html;

  // Remove comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remove common non-content elements by tag name
  text = text.replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, '');

  return cleanPageContent(text);
}
