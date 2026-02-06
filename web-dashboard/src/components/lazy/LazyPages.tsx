/**
 * LazyPages.tsx
 * 
 * Dynamic imports for all pages using React.lazy
 * Implements code splitting for performance optimization
 * 
 * @see https://react.dev/reference/react/lazy
 */
import { lazy, Suspense } from 'react';
import { SkeletonCard } from '../ui';

/**
 * Loading fallback component
 * Uses skeleton component from motion.css
 */
function PageLoadingFallback() {
  return (
    <div className="page-loading-fallback" style={{ padding: 'var(--space-6)' }}>
      <div className="skeleton skeleton-title" style={{ width: '50%', marginBottom: 'var(--space-4)' }} />
      <SkeletonCard showImage={false} descriptionLines={4} />
      <div style={{ marginTop: 'var(--space-4)' }}>
        <SkeletonCard showImage={false} descriptionLines={3} />
      </div>
    </div>
  );
}

/**
 * Wrapper for lazy-loaded components with Suspense
 * @param importFn Dynamic import function
 * @returns Wrapped lazy component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithSuspense(
  importFn: () => Promise<{ default: React.ComponentType<any> }>
): React.FC<any> {
  const LazyComponent = lazy(importFn);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function SuspenseWrapper(props: any) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ===== Core Pages =====
export const LoginPage = lazyWithSuspense(() => import('../../pages/LoginPage'));
export const AuthCallbackPage = lazyWithSuspense(() => import('../../pages/AuthCallbackPage'));
export const ForgotPasswordPage = lazyWithSuspense(() => import('../../pages/ForgotPasswordPage'));
export const ResetPasswordPage = lazyWithSuspense(() => import('../../pages/ResetPasswordPage'));
export const BindLinePage = lazyWithSuspense(() => import('../../pages/BindLinePage'));
export const ProfilePage = lazyWithSuspense(() => import('../../pages/ProfilePage'));

// ===== Dashboard & Command =====
export const CommandCenterPage = lazyWithSuspense(() => import('../../pages/CommandCenterPage'));
export const MentalHealthPage = lazyWithSuspense(() => import('../../pages/MentalHealthPage'));
export const EmergencyResponsePage = lazyWithSuspense(() => import('../../pages/EmergencyResponsePage'));

// ===== Events & Tasks =====
export const EventsPage = lazyWithSuspense(() => import('../../pages/EventsPage'));
export const TasksPage = lazyWithSuspense(() => import('../../pages/TasksPage'));

// ===== Map & Geo =====
export const MapPage = lazyWithSuspense(() => import('../../pages/MapPage'));
export const NcdrAlertsPage = lazyWithSuspense(() => import('../../pages/NcdrAlertsPage'));
export const ForecastPage = lazyWithSuspense(() => import('../../pages/ForecastPage'));

// ===== Knowledge & Manuals =====
export const ManualsPage = lazyWithSuspense(() => import('../../pages/ManualsPage'));
export const ManualDetailPage = lazyWithSuspense(() => import('../../pages/ManualDetailPage'));
export const ManualHomePage = lazyWithSuspense(() => 
  import('../../pages/manual').then(m => ({ default: m.ManualHomePage }))
);

// ===== Volunteers & Workforce =====
export const VolunteersPage = lazyWithSuspense(() => import('../../pages/VolunteersPage'));
export const VolunteerDetailPage = lazyWithSuspense(() => import('../../pages/VolunteerDetailPage'));
export const VolunteerSchedulePage = lazyWithSuspense(() => import('../../pages/VolunteerSchedulePage'));
export const VolunteerProfileSetupPage = lazyWithSuspense(() => import('../../pages/VolunteerProfileSetupPage'));
export const TrainingPage = lazyWithSuspense(() => import('../../pages/TrainingPage'));

// ===== Resources & Logistics =====
export const ResourcesPage = lazyWithSuspense(() => import('../../pages/ResourcesPage'));
export const ResourcesPublicPage = lazyWithSuspense(() => import('../../pages/ResourcesPublicPage'));
export const EquipmentPage = lazyWithSuspense(() => import('../../pages/EquipmentPage'));
export const DonationsPage = lazyWithSuspense(() => import('../../pages/DonationsPage'));
export const UnifiedResourcesPage = lazyWithSuspense(() => import('../../pages/UnifiedResourcesPage'));
export const VehicleManagementPage = lazyWithSuspense(() => import('../../pages/VehicleManagementPage'));
export const InsuranceManagementPage = lazyWithSuspense(() => import('../../pages/InsuranceManagementPage'));

// ===== Reports & Analytics =====
export const ReportPage = lazyWithSuspense(() => import('../../pages/ReportPage'));
export const ReportsAdminPage = lazyWithSuspense(() => import('../../pages/ReportsAdminPage'));
export const ReportsExportPage = lazyWithSuspense(() => import('../../pages/ReportsExportPage'));
export const AnalyticsPage = lazyWithSuspense(() => import('../../pages/AnalyticsPage'));
export const ReportSchedulePage = lazyWithSuspense(() => import('../../pages/ReportSchedulePage'));
export const UnifiedReportingPage = lazyWithSuspense(() => import('../../pages/UnifiedReportingPage'));
export const PointsReportPage = lazyWithSuspense(() => import('../../pages/PointsReportPage'));

// ===== Community =====
export const CommunityPage = lazyWithSuspense(() => import('../../pages/CommunityPage'));
export const ActivitiesPage = lazyWithSuspense(() => import('../../pages/ActivitiesPage'));
export const LeaderboardPage = lazyWithSuspense(() => import('../../pages/LeaderboardPage'));

// ===== Governance & Admin =====
export const PermissionsPage = lazyWithSuspense(() => import('../../pages/PermissionsPage'));
export const AuditLogPage = lazyWithSuspense(() => import('../../pages/AuditLogPage'));
export const BackupPage = lazyWithSuspense(() => import('../../pages/BackupPage'));
export const LabelManagementPage = lazyWithSuspense(() => import('../../pages/LabelManagementPage'));
export const ApprovalCenterPage = lazyWithSuspense(() => import('../../pages/ApprovalCenterPage'));
export const SensitiveAuditPage = lazyWithSuspense(() => import('../../pages/SensitiveAuditPage'));

// ===== Rescue Operations =====
export const SearchRescuePage = lazyWithSuspense(() => import('../../pages/SearchRescuePage'));
export const MedicalTransportPage = lazyWithSuspense(() => import('../../pages/MedicalTransportPage'));
export const FieldCommsPage = lazyWithSuspense(() => import('../../pages/FieldCommsPage'));
export const ReunificationPage = lazyWithSuspense(() => import('../../pages/ReunificationPage'));

// ===== ICS Forms =====
export const ICSFormsPage = lazyWithSuspense(() => import('../../pages/ICSFormsPage'));

// ===== AI & Hub =====
export const AITasksPage = lazyWithSuspense(() => import('../../pages/AITasksPage'));
export const AIChatPage = lazyWithSuspense(() => import('../../pages/hub/AIChatPage'));
export const NotificationsPage = lazyWithSuspense(() => import('../../pages/NotificationsPage'));
export const OfflinePrepPage = lazyWithSuspense(() => import('../../pages/OfflinePrepPage'));

// ===== Simulation & Interoperability =====
export const SimulationPage = lazyWithSuspense(() => import('../../pages/SimulationPage'));
export const InteroperabilityPage = lazyWithSuspense(() => import('../../pages/InteroperabilityPage'));

// ===== v6.0 Governance =====
export const SecurityPage = lazyWithSuspense(() => import('../../pages/governance/SecurityPage'));
export const WebhooksPage = lazyWithSuspense(() => import('../../pages/governance/WebhooksPage'));
export const BiometricPage = lazyWithSuspense(() => import('../../pages/governance/BiometricPage'));
export const SettingsPage = lazyWithSuspense(() => import('../../pages/governance/SettingsPage'));

// ===== Domain Pages =====
export const MissionCommandPage = lazyWithSuspense(() => 
  import('../../pages/domains/mission-command').then(m => ({ default: m.MissionCommandPage }))
);
export const TriagePage = lazyWithSuspense(() => 
  import('../../pages/domains/mission-command').then(m => ({ default: m.TriagePage }))
);
export const SheltersPage = lazyWithSuspense(() => 
  import('../../pages/rescue').then(m => ({ default: m.SheltersPage }))
);
export const ICSSectionDashboard = lazyWithSuspense(() => 
  import('../../pages/ics').then(m => ({ default: m.ICSSectionDashboard }))
);
export const ICS201BriefingPage = lazyWithSuspense(() => 
  import('../../pages/ics').then(m => ({ default: m.ICS201BriefingPage }))
);
export const ICS205CommsPage = lazyWithSuspense(() => 
  import('../../pages/ics').then(m => ({ default: m.ICS205CommsPage }))
);

// ===== Workforce Domain =====
export const WorkforceAttendancePage = lazyWithSuspense(() => 
  import('../../pages/domains/workforce').then(m => ({ default: m.AttendancePage }))
);
export const WorkforceLeaderboardPage = lazyWithSuspense(() => 
  import('../../pages/domains/workforce').then(m => ({ default: m.LeaderboardPage }))
);
export const WorkforceOrgChartPage = lazyWithSuspense(() => 
  import('../../pages/domains/workforce').then(m => ({ default: m.OrgChartPage }))
);
export const WorkforcePointsReportPage = lazyWithSuspense(() => 
  import('../../pages/domains/workforce').then(m => ({ default: m.PointsReportPage }))
);
export const WorkforceShiftCalendarPage = lazyWithSuspense(() => 
  import('../../pages/domains/workforce').then(m => ({ default: m.ShiftCalendarPage }))
);
export const PersonnelManagementPage = lazyWithSuspense(() => 
  import('../../pages/domains/workforce/PersonnelManagementPage')
);

// ===== Logistics Domain =====
export const LogisticsEquipmentPage = lazyWithSuspense(() => 
  import('../../pages/domains/logistics').then(m => ({ default: m.EquipmentPage }))
);
export const LogisticsResourcesPage = lazyWithSuspense(() => 
  import('../../pages/domains/logistics').then(m => ({ default: m.ResourcesPage }))
);

// ===== Data Insight Domain =====
export const DataInsightReportsPage = lazyWithSuspense(() => 
  import('../../pages/domains/data-insight').then(m => ({ default: m.ReportsPage }))
);

// ===== Connectivity Domain =====
export const ConnectivityCommunicationsPage = lazyWithSuspense(() => 
  import('../../pages/domains/connectivity').then(m => ({ default: m.CommunicationsPage }))
);

// ===== Community Domain =====
export const DomainCommunityPage = lazyWithSuspense(() => 
  import('../../pages/domains/community').then(m => ({ default: m.CommunityPage }))
);
export const CommunityCenterPage = lazyWithSuspense(() => 
  import('../../pages/domains/community/CommunityCenterPage')
);

// ===== Core Domain =====
export const CoreSettingsPage = lazyWithSuspense(() => 
  import('../../pages/domains/core').then(m => ({ default: m.SettingsPage }))
);
export const CoreDashboardPage = lazyWithSuspense(() => 
  import('../../pages/domains/core').then(m => ({ default: m.DashboardPage }))
);

// ===== Air Ops Domain =====
export const DroneControlPage = lazyWithSuspense(() => 
  import('../../pages/domains/air-ops').then(m => ({ default: m.DroneControlPage }))
);

// ===== C2 Pages =====
export const TaskDispatchPage = lazyWithSuspense(() => import('../../pages/command/TaskDispatchPage'));
export const ResourceOverviewPage = lazyWithSuspense(() => import('../../pages/resources/ResourceOverviewPage'));
export const IncidentsPage = lazyWithSuspense(() => import('../../pages/c2/IncidentsPage'));
export const DrillsPage = lazyWithSuspense(() => import('../../pages/c2/DrillsPage'));
export const AARPage = lazyWithSuspense(() => import('../../pages/c2/AARPage'));
export const ReportGeneratorPage = lazyWithSuspense(() => import('../../pages/analytics/ReportGeneratorPage'));

// ===== Account & Showcase =====
export const AccountPage = lazyWithSuspense(() => 
  import('../../pages/account').then(m => ({ default: m.AccountPage }))
);
export const ComponentShowcase = lazyWithSuspense(() => 
  import('../../pages/ComponentShowcase').then(m => ({ default: m.ComponentShowcase }))
);
