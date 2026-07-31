/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './MonitorPage.module.css';

interface HealthStatus {
    status: string;
    timestamp: string;
    service: string;
    version?: string;
    uptime?: number;
    database?: { connected: boolean };
}

interface ServiceCheck {
    name: string;
    url: string;
    status: 'ok' | 'error' | 'loading';
    latency?: number;
    lastCheck?: string;
    details?: HealthStatus;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function MonitorPage() {
    const { user: authUser } = useAuth();
    const [services, setServices] = useState<ServiceCheck[]>([
        { name: 'Backend API', url: `${API_URL}/api/v1/health`, status: 'loading' },
        { name: 'Health (Live)', url: `${API_URL}/api/v1/health/live`, status: 'loading' },
    ]);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    const checkService = useCallback(async (service: ServiceCheck): Promise<ServiceCheck> => {
        const start = performance.now();
        try {
            const res = await fetch(service.url, { signal: AbortSignal.timeout(10000) });
            const latency = Math.round(performance.now() - start);
            if (res.ok) {
                const data = await res.json().catch(() => null);
                return {
                    ...service,
                    status: 'ok',
                    latency,
                    lastCheck: new Date().toISOString(),
                    details: data,
                };
            }
            return { ...service, status: 'error', latency, lastCheck: new Date().toISOString() };
        } catch {
            return {
                ...service,
                status: 'error',
                latency: Math.round(performance.now() - start),
                lastCheck: new Date().toISOString(),
            };
        }
    }, []);

    const runHealthChecks = useCallback(async () => {
        const results = await Promise.all(services.map(checkService));
        setServices(results);
        setLastRefresh(new Date());
    }, [services, checkService]);

    useEffect(() => {
        runHealthChecks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(runHealthChecks, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, runHealthChecks]);

    const allOk = services.every(s => s.status === 'ok');
    const anyLoading = services.some(s => s.status === 'loading');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>⚡ 系統監控</h1>
                    <p className={styles.subtitle}>
                        Light Keepers 服務狀態即時監控
                    </p>
                </div>
                <div className={styles.controls}>
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={e => setAutoRefresh(e.target.checked)}
                        />
                        自動刷新 (30s)
                    </label>
                    <button className={styles.refreshBtn} onClick={runHealthChecks}>
                        🔄 立即刷新
                    </button>
                </div>
            </header>

            {/* Overall Status */}
            <div className={`${styles.overallStatus} ${anyLoading ? styles.loading : allOk ? styles.ok : styles.error}`}>
                <span className={styles.statusIcon}>
                    {anyLoading ? '⏳' : allOk ? '✅' : '🚨'}
                </span>
                <span className={styles.statusText}>
                    {anyLoading ? '檢查中...' : allOk ? '所有服務正常運作' : '部分服務異常'}
                </span>
                <span className={styles.lastUpdate}>
                    最後更新: {lastRefresh.toLocaleTimeString('zh-TW')}
                </span>
            </div>

            {/* Service Cards */}
            <div className={styles.grid}>
                {services.map(service => (
                    <div
                        key={service.name}
                        className={`${styles.card} ${styles[service.status]}`}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.cardDot} />
                            <h3 className={styles.cardTitle}>{service.name}</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metric}>
                                <span className={styles.metricLabel}>狀態</span>
                                <span className={styles.metricValue}>
                                    {service.status === 'loading' ? '⏳' : service.status === 'ok' ? '✅ 正常' : '❌ 異常'}
                                </span>
                            </div>
                            {service.latency !== undefined && (
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>延遲</span>
                                    <span className={styles.metricValue}>{service.latency}ms</span>
                                </div>
                            )}
                            {service.details?.version && (
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>版本</span>
                                    <span className={styles.metricValue}>{service.details.version}</span>
                                </div>
                            )}
                            {service.details?.service && (
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>服務</span>
                                    <span className={styles.metricValue}>{service.details.service}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* User Info */}
            {authUser && (
                <div className={styles.userInfo}>
                    <h3>當前使用者</h3>
                    <p>{authUser.displayName || authUser.email} — Level {authUser.roleLevel ?? 0}</p>
                </div>
            )}
        </div>
    );
}
