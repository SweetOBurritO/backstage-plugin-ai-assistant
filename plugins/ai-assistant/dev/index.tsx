import { createDevApp } from '@backstage/dev-utils';
import {
  aiAssistantPlugin,
  AiAssistantPage,
  AiAssistantChatModal,
} from '../src/plugin';
import { signalsPlugin } from '@backstage/plugin-signals';
import Typography from '@mui/material/Typography';
import {
  catalogPlugin,
  CatalogIndexPage,
  CatalogEntityPage,
} from '@backstage/plugin-catalog';
import { entityPage } from './EntityPage';

createDevApp()
  .registerPlugin(signalsPlugin)
  .registerPlugin(aiAssistantPlugin)
  .registerPlugin(catalogPlugin)
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
  .addPage({
    element: <CatalogIndexPage />,
    title: 'Catalog',
    path: '/catalog',
  })
  .addPage({
    path: '/catalog/:namespace/:kind/:name',
    element: <CatalogEntityPage />,
    children: entityPage,
  })
  .render();
