/**
 * Domain Architecture Routes — V2 Domain-Driven 路由
 */
import { Route } from 'react-router-dom';
import {
  MissionCommandPage,
  WorkforceAttendancePage,
  WorkforceOrgChartPage,
  WorkforceLeaderboardPage,
  WorkforcePointsReportPage,
  LogisticsResourcesPage,
  DataInsightReportsPage,
  ConnectivityCommunicationsPage,
  DomainCommunityPage,
  CommunityCenterPage,
  CoreSettingsPage,
  CoreDashboardPage,
  ReportGeneratorPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

export const domainRoutes = (
  <>
    {/* Mission Command Domain */}
    <Route path="/domains/mission-command" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="mission-command"><MissionCommandPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/mission-command/triage" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="triage" /></ProtectedRoute>} />
    <Route path="/domains/mission-command/task-dispatch" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="task-dispatch" /></ProtectedRoute>} />

    {/* Workforce Domain */}
    <Route path="/domains/workforce/shift-calendar" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="shift-calendar" /></ProtectedRoute>} />
    <Route path="/domains/workforce/attendance" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="attendance"><WorkforceAttendancePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/workforce/org-chart" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="org-chart"><WorkforceOrgChartPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/workforce/leaderboard" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-leaderboard"><WorkforceLeaderboardPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/workforce/points-report" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="workforce-points"><WorkforcePointsReportPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/workforce/personnel" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="personnel" /></ProtectedRoute>} />

    {/* Logistics Domain */}
    <Route path="/domains/logistics/equipment" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="equipment" /></ProtectedRoute>} />
    <Route path="/domains/logistics/resources" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-resources"><LogisticsResourcesPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/logistics/resource-overview" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resource-overview" /></ProtectedRoute>} />

    {/* Data Insight Domain */}
    <Route path="/domains/data-insight/reports" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="data-reports"><DataInsightReportsPage /></PageWrapper></ProtectedRoute>} />

    {/* Connectivity Domain */}
    <Route path="/domains/connectivity/communications" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="communications"><ConnectivityCommunicationsPage /></PageWrapper></ProtectedRoute>} />

    {/* Community Domain */}
    <Route path="/domains/community" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="domain-community"><DomainCommunityPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/community/center" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community-center"><CommunityCenterPage /></PageWrapper></ProtectedRoute>} />

    {/* Analytics Domain */}
    <Route path="/domains/analytics/report-generator" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="report-generator"><ReportGeneratorPage /></PageWrapper></ProtectedRoute>} />

    {/* Core Domain */}
    <Route path="/domains/core/settings" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="core-settings"><CoreSettingsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/domains/core/dashboard" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="core-dashboard"><CoreDashboardPage /></PageWrapper></ProtectedRoute>} />

    {/* Air Ops Domain */}
    <Route path="/domains/air-ops/drone-control" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="drone-control" /></ProtectedRoute>} />
  </>
);
