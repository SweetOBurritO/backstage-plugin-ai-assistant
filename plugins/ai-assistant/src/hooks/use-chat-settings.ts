import { create } from 'zustand';
import {
  fetchApiRef,
  useApi,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { useCallback, useEffect } from 'react';
import { EnabledTool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

interface ChatModalSettings {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  summaryEnabled: boolean;
  setSummaryEnabled: (enable: boolean) => void;
  toolsEnabled: EnabledTool[];
  setToolsEnabled: (tools: EnabledTool[]) => void;
}

const useChatModalSettingsStore = create<ChatModalSettings>(set => ({
  modalVisible: true,
  setModalVisible: (visible: boolean) => set({ modalVisible: visible }),
  summaryEnabled: false,
  setSummaryEnabled: (summaryEnabled: boolean) => set({ summaryEnabled }),
  toolsEnabled: [],
  setToolsEnabled: (toolsEnabled: EnabledTool[]) => set({ toolsEnabled }),
}));

export const useChatSettings = () => {
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  const modalVisible = useChatModalSettingsStore(state => state.modalVisible);
  const setModalVisible = useChatModalSettingsStore(
    state => state.setModalVisible,
  );

  const summaryEnabled = useChatModalSettingsStore(
    state => state.summaryEnabled,
  );
  const setSummaryEnabled = useChatModalSettingsStore(
    state => state.setSummaryEnabled,
  );

  const toolsEnabled = useChatModalSettingsStore(state => state.toolsEnabled);

  const setToolsEnabledState = useChatModalSettingsStore(
    state => state.setToolsEnabled,
  );

  const getAvailableTools = useCallback(async (): Promise<EnabledTool[]> => {
    const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${baseUrl}/tools`);

    const { tools } = (await response.json()) as {
      tools: EnabledTool[];
    };

    return tools;
  }, [discoveryApi, fetchApi]);

  const setToolsEnabled = useCallback(
    async (tools: EnabledTool[]) => {
      setToolsEnabledState(tools);
      const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

      await fetchApi.fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ type: 'user-tools', settings: { tools } }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    [discoveryApi, fetchApi, setToolsEnabledState],
  );

  const fetchUserEnabledTools = useCallback(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const query = new URLSearchParams({
      type: 'user-tools',
    });

    const response = await fetchApi.fetch(
      `${baseUrl}/settings?${query.toString()}`,
    );

    const {
      settings: { tools },
    } = (await response.json()) as {
      settings: { tools?: EnabledTool[] };
    };

    if (tools) {
      setToolsEnabledState(tools);
      return;
    }

    const availableTools = await getAvailableTools();

    const coreTools = availableTools.filter(tool => tool.provider === 'core');

    setToolsEnabledState(coreTools);
    // Persist to backend
    await fetchApi.fetch(`${baseUrl}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'user-tools',
        settings: { tools: coreTools },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  }, [discoveryApi, fetchApi, setToolsEnabledState, getAvailableTools]);

  useEffect(() => {
    fetchUserEnabledTools();
  }, [fetchUserEnabledTools]);

  return {
    modalVisible,
    setModalVisible,
    summaryEnabled,
    setSummaryEnabled,
    toolsEnabled,
    setToolsEnabled,
    getAvailableTools,
  };
};
