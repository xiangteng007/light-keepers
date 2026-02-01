/**
 * Fix Deleted Module References Script
 * 
 * This script removes all references to deleted modules from app.module.ts
 * and other affected files.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, 'backend', 'src');

// Modules that were deleted in the consolidation
const DELETED_MODULES = [
    // Reports (replaced by reporting-engine)
    { name: 'ReportsExportModule', path: 'reports-export' },
    { name: 'ReportBuilderModule', path: 'report-builder' },
    { name: 'ReportSchedulerModule', path: 'report-scheduler' },
    { name: 'ExcelExportModule', path: 'excel-export' },
    { name: 'PdfGeneratorModule', path: 'pdf-generator' },
    // Weather (replaced by weather-service)
    { name: 'WeatherModule', path: 'weather' },
    { name: 'WeatherForecastModule', path: 'weather-forecast' },
    { name: 'WeatherHubModule', path: 'weather-hub' },
    { name: 'WeatherAlertIntegrationModule', path: 'weather-alert-integration' },
    // AI (replaced by ai-platform)
    { name: 'AIModule', path: 'ai' },
    { name: 'AiPredictionModule', path: 'ai-prediction' },
    { name: 'AiVisionModule', path: 'ai-vision' },
    { name: 'AutoDispatchModule', path: 'auto-dispatch' },
    { name: 'AutoSummaryModule', path: 'auto-summary' },
    { name: 'EventAiModule', path: 'event-ai' },
    // Notifications (replaced by notifications)
    { name: 'PushNotificationModule', path: 'push-notification' },
    { name: 'EmailTemplateModule', path: 'email-template' },
    { name: 'TelegramBotModule', path: 'telegram-bot' },
    { name: 'SlackIntegrationModule', path: 'slack-integration' },
    // Offline (replaced by scalability)
    { name: 'OfflineSyncModule', path: 'offline-sync' },
    { name: 'OfflineMapCacheModule', path: 'offline-map-cache' },
    { name: 'OfflineTilesModule', path: 'offline-tiles' },
    { name: 'MobileSyncModule', path: 'mobile-sync' },
    // Dashboard (replaced by analytics)
    { name: 'DashboardAnalyticsModule', path: 'dashboard-analytics' },
    { name: 'DashboardBuilderModule', path: 'dashboard-builder' },
    { name: 'HeatmapAnalyticsModule', path: 'heatmap-analytics' },
    { name: 'D3ChartModule', path: 'd3-chart' },
    // Geo (replaced by location)
    { name: 'GeofenceAlertModule', path: 'geofence-alert' },
    { name: 'IndoorPositioningModule', path: 'indoor-positioning' },
    { name: 'Cesium3dModule', path: 'cesium-3d' },
    // Files (replaced by files)
    { name: 'FileUploadModule', path: 'file-upload' },
    { name: 'UploadsModule', path: 'uploads' },
    // Welfare
    { name: 'PsychologicalTrackingModule', path: 'psychological-tracking' },
    { name: 'EmotionAnalysisModule', path: 'emotion-analysis' },
    // Aerial
    { name: 'AerialImageAnalysisModule', path: 'aerial-image-analysis' },
    { name: 'DroneSwarmModule', path: 'drone-swarm' },
    { name: 'AirOpsModule', path: 'air-ops' },
    // Security
    { name: 'BiometricAuthModule', path: 'biometric-auth' },
    { name: 'TwoFactorAuthModule', path: 'two-factor-auth' },
    { name: 'DataEncryptionModule', path: 'data-encryption' },
    { name: 'SecretRotationModule', path: 'secret-rotation' },
    { name: 'IpWhitelistModule', path: 'ip-whitelist' },
    { name: 'SessionTimeoutModule', path: 'session-timeout' },
    // Audit
    { name: 'AuditLogModule', path: 'audit-log' },
    { name: 'AccessLogModule', path: 'access-log' },
    // Cache/Schedule
    { name: 'RedisCacheModule', path: 'redis-cache' },
    { name: 'ScheduledTasksModule', path: 'scheduled-tasks' },
    { name: 'SmartSchedulingModule', path: 'smart-scheduling' },
    // AR/VR
    { name: 'ArFieldGuidanceModule', path: 'ar-field-guidance' },
    { name: 'ArNavigationModule', path: 'ar-navigation' },
    { name: 'VrCommandModule', path: 'vr-command' },
    // Other
    { name: 'DonationTrackingModule', path: 'donation-tracking' },
    { name: 'CommunityResilienceModule', path: 'community-resilience' },
    { name: 'DisasterCommunityModule', path: 'disaster-community' },
    { name: 'FamilyReunificationModule', path: 'family-reunification' },
    { name: 'NgoApiModule', path: 'ngo-api' },
    { name: 'NgoIntegrationModule', path: 'ngo-integration' },
];

function removeModuleImportsFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let removedCount = 0;

    for (const mod of DELETED_MODULES) {
        // Remove import statements
        const importRegex = new RegExp(`import\\s*{\\s*${mod.name}\\s*}\\s*from\\s*['"][^'"]+['"];?\\r?\\n?`, 'g');
        const beforeImport = content;
        content = content.replace(importRegex, '');
        if (content !== beforeImport) removedCount++;

        // Remove from imports array (with comma handling)
        const arrayItemRegex = new RegExp(`\\s*${mod.name}\\s*,?\\s*(?:\\/\\/[^\\n]*)?\\r?\\n?`, 'g');
        content = content.replace(arrayItemRegex, (match) => {
            if (match.includes(mod.name)) {
                removedCount++;
                return '';
            }
            return match;
        });
    }

    // Clean up double commas and empty lines
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/\[\s*,/g, '[');
    content = content.replace(/,\s*\]/g, ']');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${removedCount} references in ${filePath}`);
        return true;
    }
    return false;
}

// Files to fix
const filesToFix = [
    path.join(BACKEND_SRC, 'app.module.ts'),
    path.join(BACKEND_SRC, 'modules', 'public', 'public.module.ts'),
    path.join(BACKEND_SRC, 'modules', 'volunteers', 'volunteers.module.ts'),
    path.join(BACKEND_SRC, 'core', 'environment', 'environment-core.module.ts'),
    path.join(BACKEND_SRC, 'core', 'admin', 'admin-core.module.ts'),
];

console.log('Fixing deleted module references...');
let fixedCount = 0;
for (const file of filesToFix) {
    if (removeModuleImportsFromFile(file)) {
        fixedCount++;
    }
}

// Also remove test files for deleted modules
const testDir = path.join(BACKEND_SRC, 'test');
if (fs.existsSync(testDir)) {
    const testFiles = fs.readdirSync(testDir);
    for (const mod of DELETED_MODULES) {
        const testFile = path.join(testDir, `${mod.path}.service.spec.ts`);
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
            console.log(`Removed test file: ${testFile}`);
        }
    }
}

console.log(`\nFixed ${fixedCount} files`);
