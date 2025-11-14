import { create } from 'zustand';

interface ChatModalSettings {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const useChatModalSettingsStore = create<ChatModalSettings>(set => ({
  visible: true,
  setVisible: (visible: boolean) => set({ visible }),
}));

export const useChatModalSettings = () => {
  const visible = useChatModalSettingsStore(state => state.visible);
  const setVisible = useChatModalSettingsStore(state => state.setVisible);

  return { visible, setVisible };
};
