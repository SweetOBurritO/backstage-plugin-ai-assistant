import { createDevApp } from '@backstage/dev-utils';
import {
  aiAssistantPlugin,
  AiAssistantPage,
  AiAssistantChatModal,
} from '../src/plugin';
import { signalsPlugin } from '@backstage/plugin-signals';

createDevApp()
  .registerPlugin(signalsPlugin)
  .registerPlugin(aiAssistantPlugin)
  .addPage({
    element: (
      <>
        <AiAssistantPage />
        <AiAssistantChatModal />
      </>
    ),
    title: 'Root Page',
    path: '/ai-assistant',
  })
  .addPage({
    element: (
      <>
        <AiAssistantChatModal />
      </>
    ),
    title: 'AI Assistant',
    path: '/modal',
  })
  .render();
