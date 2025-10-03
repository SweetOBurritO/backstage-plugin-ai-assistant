import { WikiPage } from 'azure-devops-node-api/interfaces/WikiInterfaces';

/**
 * Recursively flatten wiki pages structure into a single array
 * @param page The wiki page to flatten
 * @returns Array of all pages (including nested subpages)
 */
export const flattenWikiPages = (page: WikiPage): WikiPage[] => {
  const result: WikiPage[] = [page];

  if (page.subPages && page.subPages.length > 0) {
    for (const subPage of page.subPages) {
      result.push(...flattenWikiPages(subPage));
    }
  }

  return result;
};
