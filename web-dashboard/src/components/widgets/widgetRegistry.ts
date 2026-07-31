/**
 * widgetRegistry.ts
 *
 * Central registry mapping a widget id to a lazily-loaded content component.
 *
 * Every entry uses `React.lazy` + dynamic `import()`, so widget content never
 * ships in the first-load bundle: Rollup emits one async chunk per domain
 * module and the browser only downloads the domains a page actually renders.
 *
 * Adding a widget = add one line here + the component in its domain file
 * under `components/widgets/<domain>/`.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type WidgetModuleShape = Record<string, unknown>;

/** Wrap a named export of a dynamically imported module as a lazy component. */
function lazyWidget(
    loader: () => Promise<WidgetModuleShape>,
    exportName: string,
): LazyExoticComponent<ComponentType> {
    return lazy(async () => {
        const mod = await loader();
        return { default: mod[exportName] as ComponentType };
    });
}

// --- Domain module loaders (one async chunk each) -------------------------
const shared = () => import('./shared/primitives');
const core = () => import('./core/CoreWidgets');
const map = () => import('./map/MapWidgets');
const geo = () => import('./geo/GeoWidgets');
const ops = () => import('./ops/OpsWidgets');
const drone = () => import('./drone/DroneWidgets');
const resources = () => import('./resources/ResourceWidgets');
const workforce = () => import('./workforce/WorkforceWidgets');
const governance = () => import('./governance/GovernanceWidgets');
const settings = () => import('./settings/SettingsWidgets');
const notifications = () => import('./notifications/NotificationWidgets');
const ai = () => import('./ai/AiWidgets');
const offline = () => import('./offline/OfflineWidgets');
const community = () => import('./community/CommunityWidgets');
const intake = () => import('./intake/IntakeWidgets');
const training = () => import('./training/TrainingWidgets');

export const WIDGET_REGISTRY: Record<string, LazyExoticComponent<ComponentType>> = {
    // ===== Shared metrics =====
    'key-metrics': lazyWidget(shared, 'TranslatedKeyMetricsWidget'),
    'mission-stats': lazyWidget(shared, 'KeyMetricsWidget'),
    'resource-stats': lazyWidget(shared, 'KeyMetricsWidget'),
    'task-stats': lazyWidget(shared, 'KeyMetricsWidget'),
    'community-stats': lazyWidget(shared, 'KeyMetricsWidget'),
    'alert-summary': lazyWidget(shared, 'KeyMetricsWidget'),
    'donation-stats': lazyWidget(shared, 'KeyMetricsWidget'),
    'pending-count': lazyWidget(shared, 'KeyMetricsWidget'),

    // ===== Core / cross-cutting =====
    'quick-actions': lazyWidget(core, 'QuickActionsWidget'),
    'search-panel': lazyWidget(core, 'SearchPanelWidget'),
    'workspace': lazyWidget(core, 'WorkspaceWidget'),
    'disaster-reports': lazyWidget(core, 'DisasterReportsWidget'),

    // ===== Map =====
    'map-layers': lazyWidget(map, 'TranslatedMapLayersWidget'),
    'map-legend': lazyWidget(map, 'TranslatedMapLegendWidget'),
    'tactical-map': lazyWidget(map, 'TacticalMapWidget'),
    'incident-map': lazyWidget(map, 'TacticalMapWidget'),
    'community-map': lazyWidget(map, 'TacticalMapWidget'),
    'weather-radar': lazyWidget(map, 'TacticalMapWidget'),

    // ===== Geo-intel =====
    'geo-alert-feed': lazyWidget(geo, 'GeoAlertFeedWidget'),
    'geo-summary': lazyWidget(geo, 'GeoSummaryWidget'),
    'earthquake-monitor': lazyWidget(geo, 'EarthquakeMonitorWidget'),
    'weather-alert': lazyWidget(geo, 'WeatherAlertWidget'),
    'weather-card': lazyWidget(geo, 'WeatherAlertWidget'),
    'forecast-cards': lazyWidget(geo, 'ForecastCardsWidget'),

    // ===== Operations =====
    'task-board': lazyWidget(ops, 'TaskBoardWidget'),
    'event-list': lazyWidget(ops, 'EventListWidget'),
    'incident-list': lazyWidget(ops, 'IncidentListWidget'),
    'dispatch-queue': lazyWidget(ops, 'DispatchQueueWidget'),
    'triage-queue': lazyWidget(ops, 'TriageQueueWidget'),
    'triage-stats': lazyWidget(ops, 'TriageStatsWidget'),
    'triage-workspace': lazyWidget(ops, 'TriageWorkspaceWidget'),
    'drill-scenarios': lazyWidget(ops, 'DrillScenariosWidget'),
    'drill-controls': lazyWidget(ops, 'DrillControlsWidget'),
    'drill-log': lazyWidget(ops, 'DrillLogWidget'),

    // ===== Air ops =====
    'drone-list': lazyWidget(drone, 'DroneListWidget'),
    'drone-controls': lazyWidget(drone, 'DroneControlsWidget'),
    'drone-status': lazyWidget(drone, 'DroneStatusWidget'),
    'drone-log': lazyWidget(drone, 'DroneLogWidget'),

    // ===== Resources / logistics =====
    'ai-matches': lazyWidget(resources, 'AIMatchesWidget'),
    'requests-list': lazyWidget(resources, 'RequestsListWidget'),
    'supplies-grid': lazyWidget(resources, 'SuppliesGridWidget'),
    'resource-table': lazyWidget(resources, 'SuppliesGridWidget'),
    'resource-categories': lazyWidget(resources, 'ResourceCategoriesWidget'),
    'donation-list': lazyWidget(resources, 'DonationListWidget'),
    'approval-queue': lazyWidget(resources, 'ApprovalQueueWidget'),
    'equipment-stats': lazyWidget(resources, 'EquipmentStatsWidget'),
    'equipment-scanner': lazyWidget(resources, 'EquipmentScannerWidget'),
    'equipment-grid': lazyWidget(resources, 'EquipmentGridWidget'),

    // ===== Workforce =====
    'volunteer-grid': lazyWidget(workforce, 'VolunteerGridWidget'),
    'personnel-grid': lazyWidget(workforce, 'PersonnelGridWidget'),
    'personnel-stats': lazyWidget(workforce, 'PersonnelStatsWidget'),
    'calendar-view': lazyWidget(workforce, 'CalendarViewWidget'),
    'shift-summary': lazyWidget(workforce, 'ShiftSummaryWidget'),
    'my-shifts': lazyWidget(workforce, 'MyShiftsWidget'),
    'top-volunteers': lazyWidget(workforce, 'TopVolunteersWidget'),
    'my-ranking': lazyWidget(workforce, 'MyRankingWidget'),

    // ===== Governance =====
    'audit-table': lazyWidget(governance, 'AuditTableWidget'),
    'accounts-grid': lazyWidget(governance, 'AccountsGridWidget'),
    'tenant-list': lazyWidget(governance, 'TenantListWidget'),
    'tenant-detail': lazyWidget(governance, 'TenantDetailWidget'),
    'feature-flags': lazyWidget(governance, 'FeatureFlagsWidget'),
    'role-list': lazyWidget(governance, 'RoleListWidget'),
    'permission-matrix': lazyWidget(governance, 'PermissionMatrixWidget'),

    // ===== Settings / profile / backup =====
    'settings-nav': lazyWidget(settings, 'SettingsNavWidget'),
    'settings-panel': lazyWidget(settings, 'SettingsPanelWidget'),
    'backup-status': lazyWidget(settings, 'BackupStatusWidget'),
    'backup-list': lazyWidget(settings, 'BackupListWidget'),
    'backup-actions': lazyWidget(settings, 'BackupActionsWidget'),
    'profile-card': lazyWidget(settings, 'ProfileCardWidget'),
    'profile-settings': lazyWidget(settings, 'ProfileSettingsWidget'),
    'profile-activity': lazyWidget(settings, 'ProfileActivityWidget'),

    // ===== Notifications =====
    'notification-feed': lazyWidget(notifications, 'NotificationFeedWidget'),
    'notification-summary': lazyWidget(notifications, 'NotificationSummaryWidget'),
    'channel-status': lazyWidget(notifications, 'ChannelStatusWidget'),
    'notification-center': lazyWidget(notifications, 'NotificationCenterWidget'),
    'notification-list': lazyWidget(notifications, 'NotificationListWidget'),
    'notification-settings': lazyWidget(notifications, 'NotificationSettingsWidget'),

    // ===== AI & analytics =====
    'ai-command': lazyWidget(ai, 'AICommandWidget'),
    'ai-task-list': lazyWidget(ai, 'AITaskListWidget'),
    'ai-prediction': lazyWidget(ai, 'AIPredictionWidget'),
    'ai-suggestions': lazyWidget(ai, 'AISuggestionsWidget'),
    'ai-reports': lazyWidget(ai, 'AIReportsWidget'),
    'trends-chart': lazyWidget(ai, 'TrendsChartWidget'),
    'dashboard-stats': lazyWidget(ai, 'DashboardStatsWidget'),
    'report-generator': lazyWidget(ai, 'ReportGeneratorWidget'),
    'scheduled-reports': lazyWidget(ai, 'ScheduledReportsWidget'),

    // ===== Offline =====
    'sync-status': lazyWidget(offline, 'SyncStatusWidget'),
    'pending-queue': lazyWidget(offline, 'PendingQueueWidget'),
    'mesh-network': lazyWidget(offline, 'MeshNetworkWidget'),

    // ===== Community & wellbeing =====
    'social-feed': lazyWidget(community, 'SocialFeedWidget'),
    'blessing-wall': lazyWidget(community, 'BlessingWallWidget'),
    'activity-feed': lazyWidget(community, 'ActivityFeedWidget'),
    'activity-calendar': lazyWidget(community, 'ActivityCalendarWidget'),
    'missing-cases': lazyWidget(community, 'MissingCasesWidget'),
    'mood-tracker': lazyWidget(community, 'MoodTrackerWidget'),
    'phq9-assessment': lazyWidget(community, 'Phq9AssessmentWidget'),
    'gad7-assessment': lazyWidget(community, 'Gad7AssessmentWidget'),

    // ===== Intake =====
    'intake-form': lazyWidget(intake, 'IntakeFormWidget'),
    'intake-tips': lazyWidget(intake, 'IntakeTipsWidget'),
    'recent-intakes': lazyWidget(intake, 'RecentIntakesWidget'),
    'report-form': lazyWidget(intake, 'ReportFormWidget'),
    'recent-reports': lazyWidget(intake, 'RecentReportsWidget'),

    // ===== Training & manuals =====
    'training-progress': lazyWidget(training, 'TrainingProgressWidget'),
    'course-grid': lazyWidget(training, 'CourseGridWidget'),
    'manual-categories': lazyWidget(training, 'ManualCategoriesWidget'),
    'manual-list': lazyWidget(training, 'ManualListWidget'),
};

/** All widget ids that have registered content. */
export const REGISTERED_WIDGET_IDS = Object.keys(WIDGET_REGISTRY);

export function hasWidgetContent(widgetId: string): boolean {
    return widgetId in WIDGET_REGISTRY;
}
