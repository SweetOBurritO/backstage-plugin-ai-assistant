import { Content, Page, Header } from '@backstage/core-components';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ConversationPage } from '../ConversationPage';
import {
  conversationRouteRef,
  newConversationRouteRef,
  shareConversationRouteRef,
} from '../../routes';

import { useRouteRef } from '@backstage/core-plugin-api';
import { makeStyles } from 'tss-react/mui';

export type AiAssistantPageProps = {
  title?: string;
  subtitle?: string;
};

const useStyles = makeStyles()(theme => ({
  page: {
    minHeight: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - ${theme.spacing(6)})`,
      maxHeight: `calc(100vh - ${theme.spacing(6)})`,
      minHeight: `calc(100vh - ${theme.spacing(6)})`,
    },
  },
  content: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
}));

export const AiAssistantPage = ({
  title = 'AI Assistant',
  subtitle,
}: AiAssistantPageProps) => {
  const newConversationRoute = useRouteRef(newConversationRouteRef);
  const location = useLocation();

  const { classes } = useStyles();

  return (
    <Page themeId="tool" className={classes.page}>
      <Header title={title} subtitle={subtitle} />
      <Content noPadding stretch className={classes.content}>
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
