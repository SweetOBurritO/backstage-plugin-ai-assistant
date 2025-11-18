import { useApi } from '@backstage/core-plugin-api';
import { summarizerApiRef } from '../api/summarizer';
import { useLocation } from 'react-router-dom';
import { useAsync } from 'react-use';
import { useChatSettings } from './use-chat-settings';

export const usePageSummary = () => {
  const { summaryEnabled } = useChatSettings();
  const summarizerApi = useApi(summarizerApiRef);
  const location = useLocation();

  const {
    loading,
    error,
    value: summary,
  } = useAsync(async () => {
    if (!summaryEnabled) {
      return undefined;
    }
    const content = document.body.innerText;

    const pageSummary = await summarizerApi.summarizeContent(content);

    return pageSummary;
  }, [location, summaryEnabled]);

  return { summary, loading, error };
};
