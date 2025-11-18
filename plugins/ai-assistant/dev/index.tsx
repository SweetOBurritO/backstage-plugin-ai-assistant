import { createDevApp } from '@backstage/dev-utils';
import {
  aiAssistantPlugin,
  AiAssistantPage,
  AiAssistantChatModal,
} from '../src/plugin';
import { signalsPlugin } from '@backstage/plugin-signals';
import Typography from '@mui/material/Typography';

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
        <Typography>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ea rerum
          placeat sint assumenda reiciendis esse facere qui. Similique
          perspiciatis cumque obcaecati, eveniet exercitationem incidunt
          perferendis at odio totam, suscipit eligendi.
        </Typography>
        <AiAssistantChatModal />
      </>
    ),
    title: 'AI Assistant',
    path: '/modal',
  })
  .render();
