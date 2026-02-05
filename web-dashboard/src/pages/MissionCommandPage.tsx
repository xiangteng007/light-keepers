import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFieldReports } from '../hooks/useFieldReports';
import { useAiQueue } from '../hooks/useAiQueue';
import { ReportsPanel, SOSButton } from '../components/field-reports';
import { MapContainer } from '../components/map';
import { createLogger } from '../utils/logger';
import './MissionCommandPage.css';

const logger = createLogger('MissionCommand');

// Token storage key (same as AuthContext)
const TOKEN_KEY = 'accessToken';

/**
 * Mission Command Page
 * Command post view with field reports, SOS alerts, and live locations
 */
export function MissionCommandPage() {
    const { missionSessionId } = useParams<{ missionSessionId: string }>();
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState<'reports' | 'tasks' | 'locations'>('reports');

    // Get stored auth token
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';

    // Field reports hook
    const {
        reports,
        activeSos,
        liveLocations,
        isLoading,
        isConnected,
        triggerSos,
        ackSos,
        resolveSos,
    } = useFieldReports({
        missionSessionId: missionSessionId || '',
        token,
        userId: user?.id || '',
        displayName: user?.displayName || 'Unknown',
        role: 'officer',
    });

    // Note: Location share hook removed - not used in command post view

    // AI Queue hook for report summarization
    const {
        pendingJobs,
        results,
        summarizeReport,
        acceptResult,
        rejectResult,
        clearResult,
    } = useAiQueue({
        missionSessionId: missionSessionId || '',
        token,
        enabled: !!token && !!missionSessionId,
    });

    // Handle SOS trigger (signature matches SOSButtonProps)
    const handleSosTrigger = async (lat: number, lng: number, accuracyM?: number, message?: string) => {
        await triggerSos(lat, lng, accuracyM, message);
    };

    // Handle report triage (unused params prefixed with _)
    const handleTriaged = async (reportId: string, _status?: string, _version?: number) => {
        // Would call updateReport with status: 'triaged'
        logger.debug('Triaged:', reportId);
    };

    // Handle SOS ACK
    const handleSosAck = async (sosId: string) => {
        await ackSos(sosId, 'Acknowledged from command post');
    };

    // Handle SOS resolve
    const handleSosResolve = async (sosId: string) => {
        await resolveSos(sosId, 'Resolved from command post');
    };

    // Handle AI summarize
    const handleAiSummarize = async (reportId: string) => {
        try {
            await summarizeReport(reportId);
        } catch (err) {
            logger.error('AI summarize failed:', err);
        }
    };

    // Handle AI accept
    const handleAiAccept = async (reportId: string) => {
        try {
            await acceptResult(reportId, true);
        } catch (err) {
            logger.error('AI accept failed:', err);
        }
    };

    // Handle AI reject
    const handleAiReject = async (reportId: string) => {
        try {
            await rejectResult(reportId, '使用者拒絕');
        } catch (err) {
            logger.error('AI reject failed:', err);
        }
    };

    if (!missionSessionId) {
        return (
            <div className="mission-command-page">
                <div className="error-state">
                    <h2>任務 ID 錯誤</h2>
                    <p>請從任務列表選擇一個有效的任務</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mission-command-page">
            {/* Header */}
            <header className="command-header">
                <div className="header-left">
                    <h1>🚨 任務指揮中心</h1>
                    <span className="mission-id">{missionSessionId}</span>
                </div>
                <div className="header-right">
                    <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '🟢 已連線' : '🔴 離線'}
                    </span>
                    <span className="online-count">
                        👥 {liveLocations.length} 人在線
                    </span>
                </div>
            </header>

            {/* Main content */}
            <div className="command-content">
                {/* Sidebar */}
                <aside className="command-sidebar">
                    {/* Tabs */}
                    <div className="sidebar-tabs">
                        <button
                            className={`tab ${selectedTab === 'reports' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('reports')}
                        >
                            📋 回報 ({reports.length})
                        </button>
                        <button
                            className={`tab ${selectedTab === 'locations' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('locations')}
                        >
                            📍 位置 ({liveLocations.length})
                        </button>
                    </div>

                    {/* Panel content */}
                    <div className="sidebar-content">
                        {selectedTab === 'reports' && (
                            <ReportsPanel
                                reports={reports}
                                activeSos={activeSos}
                                isLoading={isLoading}
                                onSelectReport={(report) => logger.debug('View report:', report.id)}
                                onTriageReport={(id) => handleTriaged(id)}
                                onAckSos={handleSosAck}
                                onResolveSos={handleSosResolve}
                                pendingAiJobs={pendingJobs}
                                aiResults={results}
                                onAiSummarize={handleAiSummarize}
                                onAiAccept={handleAiAccept}
                                onAiReject={handleAiReject}
                                onAiDismiss={clearResult}
                            />
                        )}
                        {selectedTab === 'locations' && (
                            <div className="locations-list">
                                {liveLocations.length === 0 ? (
                                    <p className="empty-state">目前沒有人分享位置</p>
                                ) : (
                                    liveLocations.map(loc => (
                                        <div key={loc.userId} className="location-item">
                                            <span className="location-name">{loc.displayName}</span>
                                            <span className="location-time">
                                                {new Date(loc.lastAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Map */}
                <main className="command-map">
                    <MapContainer
                        reports={reports}
                        activeSos={activeSos}
                        liveLocations={liveLocations}
                        onReportClick={(report) => logger.debug('Report clicked:', report.id)}
                        onSosClick={(sos) => logger.debug('SOS clicked:', sos.id)}
                        onLocationClick={(loc) => logger.debug('Location clicked:', loc.userId)}
                    />
                </main>
            </div>

            {/* SOS button for testing */}
            <div className="sos-container">
                <SOSButton
                    onTrigger={handleSosTrigger}
                    isEnabled={true}
                />
            </div>
        </div>
    );
}

export default MissionCommandPage;
