import { create } from 'zustand';

interface ChatModalSettings {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  summaryEnabled: boolean;
  setSummaryEnabled: (enable: boolean) => void;
}

const useChatModalSettingsStore = create<ChatModalSettings>(set => ({
  modalVisible: true,
  setModalVisible: (visible: boolean) => set({ modalVisible: visible }),
  summaryEnabled: false,
  setSummaryEnabled: (summaryEnabled: boolean) => set({ summaryEnabled }),
}));

export const useChatSettings = () => {
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

  return { modalVisible, setModalVisible, summaryEnabled, setSummaryEnabled };
};
