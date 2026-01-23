import { analyticsApiRef, useApi } from '@backstage/core-plugin-api';

type CaptureEventOptions = {
  action: string;
  subject: string;
  attributes?: Record<string, string | boolean | number>;
  context?: Record<string, string | boolean | number | undefined>;
};

export const useAnalytics = () => {
  const analyticsApi = useApi(analyticsApiRef);

  const captureEvent = ({
    action,
    subject,
    attributes = {},
    context = {},
  }: CaptureEventOptions) => {
    analyticsApi.captureEvent({
      action: `ai_assistant_${action}`,
      subject,
      context: {
        extension: 'ai-assistant',
        pluginId: 'ai-assistant',
        routeRef: 'ai-assistant',
        ...context,
      },
      attributes,
    });
  };

  return { captureEvent };
};
