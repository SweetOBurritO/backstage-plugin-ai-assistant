import { useAnalytics as useBackstageAnalytics } from '@backstage/core-plugin-api';
import { useCallback, useMemo } from 'react';

type CaptureEventOptions = {
  action: string;
  subject: string;
  attributes?: Record<string, string | boolean | number>;
};

export const useAnalytics = () => {
  const analyticsTracker = useBackstageAnalytics();

  const captureEvent = useCallback(
    ({ action, subject, attributes }: CaptureEventOptions) => {
      analyticsTracker.captureEvent(`ai_assistant_${action}`, subject, {
        attributes,
      });
    },
    [analyticsTracker],
  );

  return useMemo(() => ({ captureEvent }), [captureEvent]);
};
