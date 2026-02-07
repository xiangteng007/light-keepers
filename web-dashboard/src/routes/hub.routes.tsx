/**
 * Hub Routes — 通知、天氣、AI、離線準備
 */
import { Route } from 'react-router-dom';
import {
  NotificationsPage,
  NcdrAlertsPage,
  ForecastPage,
  AnalyticsPage,
  AITasksPage,
  AIChatPage,
  OfflinePrepPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

export const hubRoutes = (
  <>
    <Route path="/hub/notifications" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="hub-notifications"><NotificationsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/hub/geo-alerts" element={<PageWrapper pageId="hub-geo-alerts"><NcdrAlertsPage /></PageWrapper>} />
    <Route path="/hub/weather" element={<PageWrapper pageId="hub-weather"><ForecastPage /></PageWrapper>} />
    <Route path="/hub/analytics" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="hub-analytics"><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/hub/ai" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="hub-ai"><AITasksPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/hub/ai-chat" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="hub-ai-chat"><AIChatPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/hub/offline" element={<PageWrapper pageId="hub-offline"><OfflinePrepPage /></PageWrapper>} />
  </>
);
