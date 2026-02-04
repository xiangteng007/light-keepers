/**
 * Widget i18n Utility
 * Maps widget IDs to translation keys for dynamic title translation
 */

import { TFunction } from 'i18next';

/**
 * Widget ID to translation key mapping
 * Keys follow the pattern: widgets.{widgetId}.title
 */
const WIDGET_TITLE_KEYS: Record<string, string> = {
  // Core Dashboard Widgets
  'mission-stats': 'widgets.missionStats.title',
  'workspace': 'widgets.situationMap.title',
  'ncdr-alerts': 'widgets.ncdrAlerts.title',
  'disaster-reports': 'widgets.disasterReports.title',
  'event-timeline': 'widgets.eventTimeline.title',
  'volunteer-status': 'widgets.volunteerStatus.title',
  'quick-actions': 'widgets.quickActions.title',

  // Map & Geo
  'tactical-map': 'widgets.tacticalMap.title',
  'weather-radar': 'widgets.weatherRadar.title',
  'earthquake-map': 'widgets.earthquakeMap.title',
  'map-layers': 'widgets.mapLayers.title',
  'map-legend': 'widgets.mapLegend.title',

  // Data & Alerts
  'ai-matches': 'widgets.aiMatches.title',
  'requests-list': 'widgets.requestsList.title',
  'supplies-grid': 'widgets.suppliesGrid.title',
  'missing-cases': 'widgets.missingCases.title',
  'audit-table': 'widgets.auditTable.title',

  // Tools
  'ptt-panel': 'widgets.pttPanel.title',
  'resource-search': 'widgets.resourceSearch.title',
  'search-panel': 'widgets.searchPanel.title',
  'report-form': 'widgets.reportForm.title',

  // Community
  'blessing-wall': 'widgets.blessingWall.title',
  'mood-tracker': 'widgets.moodTracker.title',
  'pfa-chat': 'widgets.pfaChat.title',

  // Analytics
  'resource-chart': 'widgets.resourceChart.title',
  'trends-chart': 'widgets.trendsChart.title',
  'ai-reports': 'widgets.aiReports.title',
  'key-metrics': 'widgets.keyMetrics.title',

  // Core / Admin
  'accounts-grid': 'widgets.accountsGrid.title',
  'tenant-list': 'widgets.tenantList.title',
  'tenant-detail': 'widgets.tenantDetail.title',
  'settings-nav': 'widgets.settingsNav.title',
  'settings-panel': 'widgets.settingsPanel.title',
  'feature-flags': 'widgets.featureFlags.title',

  // Hub Widgets
  'notification-feed': 'widgets.notificationFeed.title',
  'notification-summary': 'widgets.notificationSummary.title',
  'channel-status': 'widgets.channelStatus.title',
  'geo-alert-feed': 'widgets.geoAlertFeed.title',
  'geo-summary': 'widgets.geoSummary.title',
  'weather-card': 'widgets.weatherCard.title',
  'earthquake-monitor': 'widgets.earthquakeMonitor.title',
  'dashboard-stats': 'widgets.dashboardStats.title',
  'report-generator': 'widgets.reportGenerator.title',
  'scheduled-reports': 'widgets.scheduledReports.title',
  'ai-task-list': 'widgets.aiTasks.title',
  'ai-prediction': 'widgets.aiPrediction.title',
  'ai-suggestions': 'widgets.aiSuggestions.title',
  'sync-status': 'widgets.syncStatus.networkStatus',
  'pending-queue': 'widgets.pendingQueue.title',
  'mesh-network': 'widgets.meshNetwork.title',

  // Intake Widgets
  'intake-form': 'widgets.intakeForm.title',
  'intake-tips': 'widgets.intakeTips.title',
  'recent-intakes': 'widgets.recentIntakes.title',
};

/**
 * Get translated widget title
 * @param widgetId - The widget's unique identifier
 * @param fallback - Fallback title if translation not found
 * @param t - i18next translation function
 * @returns Translated title or fallback
 */
export function getWidgetTitle(
  widgetId: string,
  fallback: string,
  t: TFunction
): string {
  const key = WIDGET_TITLE_KEYS[widgetId];
  if (key) {
    const translated = t(key, { defaultValue: '' });
    return translated || fallback;
  }
  return fallback;
}

/**
 * Check if a widget has a translation key defined
 */
export function hasWidgetTranslation(widgetId: string): boolean {
  return widgetId in WIDGET_TITLE_KEYS;
}

/**
 * Get all widget IDs that have translations
 */
export function getTranslatedWidgetIds(): string[] {
  return Object.keys(WIDGET_TITLE_KEYS);
}

export default WIDGET_TITLE_KEYS;
