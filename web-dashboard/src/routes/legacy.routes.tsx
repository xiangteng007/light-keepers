/**
 * Legacy Routes — R1 / FE-7 IA 收斂後
 *
 * 收斂原則（docs/audit/ROUTE_IA_RECONCILIATION.md §4a Type-A 20 組）：
 * - 同一元件多路徑 → 收斂為單一 canonical 路徑，其餘 <Navigate replace> redirect
 * - canonical 選擇：以 page-policy.ts 收錄路徑優先，其次新一代 namespaced 路徑
 * - 例外：/emergency/{sos,evacuation,hotline} 三條為刻意的情境別名
 *   （同元件依路徑區分場景），不收斂
 * - 16 條假 widget 空殼路由：2 條 redirect（/reunification、/audit）、
 *   14 條掛「頁面建置中」placeholder（PageWrapper placeholder prop）
 * - 權限矛盾修正（以 page-policy 為準）：/tasks L2→L1
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
  ResourcesPublicPage,
  ReportPage,
  ReportsAdminPage,
  ReportsExportPage,
  ReportSchedulePage,
  UnifiedReportingPage,
  SimulationPage,
  PointsReportPage,
  CommunityPage,
  ActivitiesPage,
  LeaderboardPage,
  VehicleManagementPage,
  InsuranceManagementPage,
  ApprovalCenterPage,
  SensitiveAuditPage,
  LabelManagementPage,
  BackupPage,
  ManualsPage,
  ManualDetailPage,
  ManualHomePage,
  IncidentsPage,
  AARPage,
  WorkforceShiftCalendarPage,
  CommunityCenterPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';
import HomeRedirect from '../components/HomeRedirect';
import RedirectWithParams from '../components/RedirectWithParams';

export const legacyRoutes = (
  <>
    {/* ===== 戰情儀表板（canonical: /command-center）===== */}
    <Route path="/command-center" element={<ProtectedRoute requiredLevel={0}><CommandCenterPage /></ProtectedRoute>} />
    <Route path="/dashboard" element={<Navigate to="/command-center" replace />} />

    {/* 心理支持（canonical: /community/mental-health）*/}
    <Route path="/mental-health" element={<Navigate to="/community/mental-health" replace />} />

    {/* ===== Emergency 緊急快捷（刻意情境別名，不收斂）===== */}
    <Route path="/emergency/sos" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="emergency-sos"><EmergencyResponsePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/emergency/evacuation" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="emergency-evacuation"><EmergencyResponsePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/emergency/hotline" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="emergency-hotline"><EmergencyResponsePage /></PageWrapper></ProtectedRoute>} />

    {/* ICS（canonical: /ics，見 rescue.routes.tsx）*/}
    <Route path="/command/ic" element={<Navigate to="/ics" replace />} />

    {/* 根路由：智能導向 */}
    <Route index element={<HomeRedirect />} />

    {/* Intake（canonical 通報入口；/report 收斂至此）*/}
    <Route path="/intake" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="intake"><ReportPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/report" element={<Navigate to="/intake" replace />} />

    {/* Knowledge Routes（canonical: /knowledge/manuals/:id）*/}
    <Route path="/knowledge/manuals" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="knowledge-manuals"><ManualsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/knowledge/manuals/:id" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="manual-detail"><ManualDetailPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/manuals/:id" element={<RedirectWithParams to="/knowledge/manuals/:id" />} />
    <Route path="/manuals-v3" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="manuals-v3"><ManualHomePage /></PageWrapper></ProtectedRoute>} />

    {/* Workforce（canonical: /workforce/people；/volunteers、/workforce/mobilization 收斂）*/}
    <Route path="/workforce/people" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-people"><VolunteersPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/workforce/shifts" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-shifts"><WorkforceShiftCalendarPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/workforce/performance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-performance"><LeaderboardPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/workforce/mobilization" element={<Navigate to="/workforce/people" replace />} />
    <Route path="/volunteers" element={<Navigate to="/workforce/people" replace />} />
    <Route path="/leaderboard" element={<Navigate to="/workforce/performance" replace />} />

    {/* Community */}
    <Route path="/community/hub" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community-hub"><CommunityCenterPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/community/mental-health" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="mental-health"><MentalHealthPage /></PageWrapper></ProtectedRoute>} />

    {/* Analytics（canonical: /analytics/reports；/reports*、/analytics 收斂）*/}
    <Route path="/analytics/reports" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-reports"><ReportsAdminPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/analytics/unified-reporting" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-unified-reporting"><UnifiedReportingPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/analytics/simulation" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-simulation"><SimulationPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/reports" element={<Navigate to="/analytics/reports" replace />} />
    <Route path="/reports/admin" element={<Navigate to="/analytics/reports" replace />} />
    <Route path="/analytics" element={<Navigate to="/hub/analytics" replace />} />

    {/* 通知（canonical: /hub/notifications，見 hub.routes.tsx）*/}
    <Route path="/notifications" element={<Navigate to="/hub/notifications" replace />} />

    {/* ===== 志工等級 (1) ===== */}
    <Route path="/events" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="events"><EventsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="training"><TrainingPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="profile"><ProfilePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/resources-public" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="resources-public"><ResourcesPublicPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/community" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community"><CommunityPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/reunification" element={<Navigate to="/rescue/reunification" replace />} />
    <Route path="/activities" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="activities"><ActivitiesPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/my-vehicles" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-vehicles"><VehicleManagementPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/my-insurance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-insurance"><InsuranceManagementPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/my-points" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-points"><PointsReportPage /></PageWrapper></ProtectedRoute>} />
    {/* R1 權限矛盾修正：page-policy=L1，route 原為 L2（sidebar 可見卻被擋）→ 以 policy 為準 */}
    <Route path="/tasks" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="tasks"><TasksPage /></PageWrapper></ProtectedRoute>} />

    {/* ===== 幹部等級 (2) ===== */}
    <Route path="/volunteers/:id" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteer-detail"><VolunteerDetailPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/volunteers/schedule" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteer-schedule"><VolunteerSchedulePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/resources" element={<Navigate to="/logistics/inventory" replace />} />
    <Route path="/approvals" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="approvals"><ApprovalCenterPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/report-schedules" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="report-schedules"><ReportSchedulePage /></PageWrapper></ProtectedRoute>} />
    {/* 空殼路由 → 建置中 placeholder（無元件可接，待 owner 圈選，見 PAGE_REMOVAL_PROPOSAL.md）*/}
    <Route path="/resource-matching" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resource-matching" placeholder /></ProtectedRoute>} />
    <Route path="/ai-summary" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ai-summary" placeholder /></ProtectedRoute>} />

    {/* C2 Additional Pages */}
    <Route path="/incidents" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="incidents"><IncidentsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/drills" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="drills" placeholder /></ProtectedRoute>} />
    <Route path="/aar" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="aar"><AARPage /></PageWrapper></ProtectedRoute>} />

    {/* ===== 常務理事等級 (3) ===== */}
    <Route path="/reports/export" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="reports-export"><ReportsExportPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/sensitive-audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="sensitive-audit"><SensitiveAuditPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/label-management" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="label-management"><LabelManagementPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/backups" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="backups"><BackupPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/audit" element={<Navigate to="/governance/audit" replace />} />

    {/* ===== 理事長等級 (4) ===== */}
    <Route path="/permissions" element={<Navigate to="/governance/iam" replace />} />
    <Route path="/accounts" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="accounts" placeholder /></ProtectedRoute>} />

    {/* ===== 系統擁有者等級 (5) ===== */}
    <Route path="/donations" element={<Navigate to="/logistics/donations" replace />} />
    <Route path="/tenants" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="tenants" placeholder /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="settings" placeholder /></ProtectedRoute>} />
    <Route path="/features" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="features" placeholder /></ProtectedRoute>} />
  </>
);
