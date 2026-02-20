import { Content, Page, Header } from '@backstage/core-components';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ConversationPage } from '../ConversationPage';
import {
  conversationRouteRef,
  newConversationRouteRef,
  shareConversationRouteRef,
} from '../../routes';

import { useRouteRef } from '@backstage/core-plugin-api';

export type AiAssistantPageProps = {
  title?: string;
  subtitle?: string;
};

export const AiAssistantPage = ({
  title = 'AI Assistant',
  subtitle,
}: AiAssistantPageProps) => {
  const newConversationRoute = useRouteRef(newConversationRouteRef);
  const location = useLocation();

  return (
    <Page themeId="tool">
      <Header title={title} subtitle={subtitle} />
      <Content noPadding stretch>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={`${newConversationRoute()}${location.search}`}
                relative="route"
                replace
              />
            }
          />
          <Route
            path={newConversationRouteRef.path}
            element={<ConversationPage />}
          />
          <Route
            path={conversationRouteRef.path}
            element={<ConversationPage />}
          />
          <Route
            path={shareConversationRouteRef.path}
            element={<ConversationPage />}
          />
        </Routes>
      </Content>
    </Page>
  );
};
