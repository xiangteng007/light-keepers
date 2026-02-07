/**
 * Legacy Routes — 按權限等級分組的舊路由
 * 包含志工(1)、幹部(2)、常務理事(3)、理事長(4)、系統擁有者(5) 等級的頁面
 */
import { Route, Navigate } from 'react-router-dom';
import {
  ProfilePage,
  CommandCenterPage,
  MentalHealthPage,
  EmergencyResponsePage,
  EventsPage,
  TasksPage,
  VolunteersPage,
  VolunteerDetailPage,
  VolunteerSchedulePage,
  TrainingPage,
  ResourcesPage,
  ResourcesPublicPage,
  DonationsPage,
  ReportPage,
  ReportsAdminPage,
  ReportsExportPage,
  AnalyticsPage,
  ReportSchedulePage,
  UnifiedReportingPage,
  SimulationPage,
  PointsReportPage,
  CommunityPage,
  ActivitiesPage,
  LeaderboardPage,
  NotificationsPage,
  VehicleManagementPage,
  InsuranceManagementPage,
  ApprovalCenterPage,
  SensitiveAuditPage,
  LabelManagementPage,
  BackupPage,
  PermissionsPage,
  ManualsPage,
  ManualDetailPage,
  ManualHomePage,
  IncidentsPage,
  AARPage,
  ICSSectionDashboard,
  WorkforceShiftCalendarPage,
  CommunityCenterPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';
import HomeRedirect from '../components/HomeRedirect';

export const legacyRoutes = (
  <>
    {/* ===== Dashboard 和 Command Center ===== */}
    <Route path="/dashboard" element={<ProtectedRoute requiredLevel={0}><CommandCenterPage /></ProtectedRoute>} />
    <Route path="/command-center" element={<ProtectedRoute requiredLevel={0}><CommandCenterPage /></ProtectedRoute>} />
    <Route path="/mental-health" element={<PageWrapper pageId="mental-health"><MentalHealthPage /></PageWrapper>} />

    {/* ===== Emergency 緊急快捷 Routes ===== */}
    <Route path="/emergency/sos" element={<PageWrapper pageId="emergency-sos"><EmergencyResponsePage /></PageWrapper>} />
    <Route path="/emergency/evacuation" element={<PageWrapper pageId="emergency-evacuation"><EmergencyResponsePage /></PageWrapper>} />
    <Route path="/emergency/hotline" element={<PageWrapper pageId="emergency-hotline"><EmergencyResponsePage /></PageWrapper>} />

    {/* Command IC Dashboard */}
    <Route path="/command/ic" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="command-ic"><ICSSectionDashboard /></PageWrapper></ProtectedRoute>} />

    {/* 根路由：智能導向 */}
    <Route index element={<HomeRedirect />} />

    {/* Intake Route (統一通報入口) */}
    <Route path="/intake" element={<PageWrapper pageId="intake"><ReportPage /></PageWrapper>} />

    {/* Knowledge Routes */}
    <Route path="/knowledge/manuals" element={<PageWrapper pageId="knowledge-manuals"><ManualsPage /></PageWrapper>} />
    <Route path="/knowledge/manuals/:id" element={<PageWrapper pageId="manual-detail"><ManualDetailPage /></PageWrapper>} />
    <Route path="/manuals/:id" element={<PageWrapper pageId="manual-detail"><ManualDetailPage /></PageWrapper>} />
    <Route path="/manuals-v3" element={<PageWrapper pageId="manuals-v3"><ManualHomePage /></PageWrapper>} />

    {/* Workforce Routes */}
    <Route path="/workforce/people" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-people"><VolunteersPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/workforce/shifts" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-shifts"><WorkforceShiftCalendarPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/workforce/performance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-performance"><LeaderboardPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/workforce/mobilization" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="workforce-mobilization"><VolunteersPage /></PageWrapper></ProtectedRoute>} />

    {/* Community Routes */}
    <Route path="/community/hub" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community-hub"><CommunityCenterPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/community/mental-health" element={<PageWrapper pageId="mental-health"><MentalHealthPage /></PageWrapper>} />

    {/* Analytics Routes */}
    <Route path="/analytics/reports" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-reports"><ReportsAdminPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/analytics/unified-reporting" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-unified-reporting"><UnifiedReportingPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/analytics/simulation" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-simulation"><SimulationPage /></PageWrapper></ProtectedRoute>} />

    {/* ===== 志工等級 (1) ===== */}
    <Route path="/events" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="events"><EventsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/report" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="report"><ReportPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="training"><TrainingPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="notifications"><NotificationsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="profile"><ProfilePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/resources-public" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="resources-public"><ResourcesPublicPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/community" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community"><CommunityPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/reunification" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="reunification" /></ProtectedRoute>} />
    <Route path="/activities" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="activities"><ActivitiesPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/leaderboard" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="leaderboard"><LeaderboardPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/my-vehicles" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-vehicles"><VehicleManagementPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/my-insurance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-insurance"><InsuranceManagementPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/my-points" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-points"><PointsReportPage /></PageWrapper></ProtectedRoute>} />

    {/* ===== 幹部等級 (2) ===== */}
    <Route path="/tasks" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="tasks"><TasksPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/volunteers" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteers"><VolunteersPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/volunteers/:id" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteer-detail"><VolunteerDetailPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/volunteers/schedule" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteer-schedule"><VolunteerSchedulePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/resources" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resources"><ResourcesPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/approvals" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="approvals"><ApprovalCenterPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/report-schedules" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="report-schedules"><ReportSchedulePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/reports" element={<Navigate to="/reports/admin" replace />} />
    <Route path="/reports/admin" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="reports-admin"><ReportsAdminPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/resource-matching" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resource-matching" /></ProtectedRoute>} />
    <Route path="/ai-summary" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ai-summary" /></ProtectedRoute>} />

    {/* C2 Additional Pages */}
    <Route path="/incidents" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="incidents"><IncidentsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/drills" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="drills" /></ProtectedRoute>} />
    <Route path="/aar" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="aar"><AARPage /></PageWrapper></ProtectedRoute>} />

    {/* ===== 常務理事等級 (3) ===== */}
    <Route path="/reports/export" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="reports-export"><ReportsExportPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="analytics"><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/sensitive-audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="sensitive-audit"><SensitiveAuditPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/label-management" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="label-management"><LabelManagementPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/backups" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="backups"><BackupPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="audit" /></ProtectedRoute>} />

    {/* ===== 理事長等級 (4) ===== */}
    <Route path="/permissions" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="permissions"><PermissionsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/accounts" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="accounts" /></ProtectedRoute>} />

    {/* ===== 系統擁有者等級 (5) ===== */}
    <Route path="/donations" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="donations"><DonationsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/tenants" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="tenants" /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="settings" /></ProtectedRoute>} />
    <Route path="/features" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="features" /></ProtectedRoute>} />
  </>
);
