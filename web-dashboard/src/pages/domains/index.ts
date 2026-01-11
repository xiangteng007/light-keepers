/**
 * domains/index.ts
 * 
 * P9: Domain Page Index
 * Exports all domain-specific pages for the 7 workflow domains
 */

// ============================================================
// C2 Domain - 指揮控制
// ============================================================
export { default as CommandCenterPage } from '../CommandCenterPage';
export { default as EventsPage } from '../EventsPage';
export { default as TasksPage } from '../TasksPage';
export { default as TriagePage } from '../TriagePage';
export { default as MissionCommandPage } from '../MissionCommandPage';

// ============================================================
// Geo Domain - 地理情資
// ============================================================
export { default as TacticalMapPage } from '../TacticalMapPage';
export { default as MapPage } from '../MapPage';

// ============================================================
// Log Domain - 後勤資源
// ============================================================
export { default as ResourcesPage } from '../ResourcesPage';
export { default as EquipmentPage } from '../EquipmentPage';
export { default as DonationsPage } from '../DonationsPage';

// ============================================================
// HR Domain - 人力動員
// ============================================================
export { default as VolunteersPage } from '../VolunteersPage';
export { default as TrainingPage } from '../TrainingPage';
export { default as ShiftCalendarPage } from '../ShiftCalendarPage';
export { default as AttendancePage } from '../AttendancePage';
export { default as OrgChartPage } from '../OrgChartPage';

// ============================================================
// Community Domain - 社區治理
// ============================================================
export { default as CommunityPage } from '../CommunityPage';
export { default as ReunificationPage } from '../ReunificationPage';
export { default as MentalHealthPage } from '../MentalHealthPage';

// ============================================================
// Analytics Domain - 分析報表
// ============================================================
export { default as AnalyticsPage } from '../AnalyticsPage';
export { default as ReportPage } from '../ReportPage';
export { default as LeaderboardPage } from '../LeaderboardPage';

// ============================================================
// Core Domain - 平台治理
// ============================================================
export { default as ProfilePage } from '../ProfilePage';
export { default as PermissionsPage } from '../PermissionsPage';
export { default as BackupPage } from '../BackupPage';
