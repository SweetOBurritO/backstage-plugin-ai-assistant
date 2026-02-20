import { Content, Page } from '@backstage/core-components';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ConversationPage } from '../ConversationPage';
import { conversationRouteRef, newConversationRouteRef } from '../../routes';

import { useRouteRef } from '@backstage/core-plugin-api';

export const AiAssistantPage = () => {
  const newConversationRoute = useRouteRef(newConversationRouteRef);
  const location = useLocation();

  return (
    <Page themeId="tool">
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
        </Routes>
      </Content>
    </Page>
  );
};
