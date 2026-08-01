/**
 * CommandCenterPage.tsx — 戰情總覽（COP 態勢牆）R2a / FE-7 重設計
 *
 * 資訊架構：指揮官／幹部在災時 10 秒內要依序回答——
 *   1. 現在的災級／警報狀態？   → shell 的 EmergencyStatusBar ＋「活動警報」面板
 *   2. 通報量多少？未處理幾件？ → KPI「通報總數」（帶 7 日趨勢）／「未處理通報」
 *   3. 派遣量能撐得住嗎？       → KPI「派遣中任務」（含逾期）
 *   4. 有無大量傷患（MCI）？    → KPI「大量傷患事件」（含預估傷患數）
 *   5. 最新發生什麼事？         → 「最新通報」時間流
 *   6. 熱點在哪？               → 「災情熱點」縮覽（連往統一地圖）
 *   7. 資源／人力水位？         → 「資源水位」／「人力概況」
 *
 * 版面取捨（widget 牆 → 定製版面）：態勢牆的資訊優先序是產品決策，
 * 不應依賴 L5 手動編排 widget；原 PAGE_WIDGET_CONFIGS['command-center']
 * 的 DEFAULT_WIDGETS 牆改為固定 IA 的 12 欄格線版面。widget 系統保留給
 * 其他 dashboard 類頁面（PageWrapper 有 children 時自動走 legacy 模式）。
 *
 * 資料：一律 src/api/services ＋ react-query（30 秒輪詢）；後端缺資料的
 * 區塊以 EmptyState 明示，不擺假資料。三態（light/dark/tactical）由語義
 * token 自動生效；災時模式僅以 CSS 提高密度。
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, AlertTriangle, Truck, HeartPulse, MapPin } from 'lucide-react';
import {
    getReportStats,
    getReports,
    getTaskStats,
    getNcdrAlerts,
    getResourceStats,
    getLowStockResources,
    getVolunteerStats,
    getHotspots,
    getReportTrend,
} from '../api/services';
import type { NcdrAlert, Report, ReportSeverity, ReportStatus } from '../api/services';
import { Badge, Button, ProgressBar } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import PageWrapper from '../components/layout/PageWrapper';
import { getDisasterTypeMeta } from '../constants/disasterTypes';
import { KpiCard, Panel, SkeletonRows, Sparkline, formatTimeAgo } from './situational/SituationalPrimitives';
import './CommandCenterPage.css';

const REFRESH_MS = 30_000;

/** 通報嚴重度 → Badge 語意對照（DESIGN_LANGUAGE §3） */
const SEVERITY_BADGE: Record<
    ReportSeverity,
    { label: string; variant: 'default' | 'warning' | 'danger'; dot?: boolean; pulse?: boolean }
> = {
    low: { label: '輕微', variant: 'default' },
    medium: { label: '中等', variant: 'warning' },
    high: { label: '嚴重', variant: 'danger' },
    critical: { label: '緊急', variant: 'danger', dot: true, pulse: true },
};

const STATUS_LABEL: Record<ReportStatus, string> = {
    pending: '待審核',
    confirmed: '已確認',
    rejected: '已退回',
};

/** NCDR 警報等級 → Badge 語意對照 */
const ALERT_BADGE: Record<NcdrAlert['severity'], { label: string; variant: 'danger' | 'warning' | 'info' }> = {
    critical: { label: '危急', variant: 'danger' },
    warning: { label: '警戒', variant: 'warning' },
    info: { label: '資訊', variant: 'info' },
};

export default function CommandCenterPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── 資料（api/services ＋ react-query；COP 牆 30 秒輪詢） ──
    const reportStatsQ = useQuery({
        queryKey: ['cc', 'reportStats'],
        queryFn: () => getReportStats().then(r => r.data?.data ?? null),
        refetchInterval: REFRESH_MS,
    });
    const taskStatsQ = useQuery({
        queryKey: ['cc', 'taskStats'],
        queryFn: () => getTaskStats().then(r => r.data?.data ?? null),
        refetchInterval: REFRESH_MS,
    });
    const mciQ = useQuery({
        queryKey: ['cc', 'mciReports'],
        queryFn: () =>
            getReports({ isMassCasualty: true, status: 'confirmed', limit: 50 }).then(r => r.data?.data ?? []),
        refetchInterval: REFRESH_MS,
    });
    const trendQ = useQuery({
        queryKey: ['cc', 'reportTrend'],
        queryFn: () => getReportTrend(7).then(r => r.data?.data ?? null),
        staleTime: 5 * 60_000,
    });
    const alertsQ = useQuery({
        queryKey: ['cc', 'ncdrAlerts'],
        queryFn: () => getNcdrAlerts({ activeOnly: true, limit: 6 }).then(r => r.data?.data ?? []),
        refetchInterval: REFRESH_MS,
    });
    const feedQ = useQuery({
        queryKey: ['cc', 'recentReports'],
        queryFn: () => getReports({ limit: 8 }).then(r => r.data?.data ?? []),
        refetchInterval: REFRESH_MS,
    });
    const hotspotsQ = useQuery({
        queryKey: ['cc', 'hotspots'],
        queryFn: () => getHotspots({ days: 7 }).then(r => r.data?.data ?? null),
        staleTime: 5 * 60_000,
    });
    const resourceStatsQ = useQuery({
        queryKey: ['cc', 'resourceStats'],
        queryFn: () => getResourceStats().then(r => r.data?.data ?? null),
        refetchInterval: REFRESH_MS,
    });
    const lowStockQ = useQuery({
        queryKey: ['cc', 'lowStock'],
        queryFn: () => getLowStockResources().then(r => r.data?.data ?? []),
        refetchInterval: REFRESH_MS,
    });
    const volunteerStatsQ = useQuery({
        queryKey: ['cc', 'volunteerStats'],
        queryFn: () => getVolunteerStats().then(r => r.data?.data ?? null),
        refetchInterval: REFRESH_MS,
    });

    // ── 派生資料 ──
    const rs = reportStatsQ.data;
    const ts = taskStatsQ.data;
    const mciReports = mciQ.data ?? [];
    const casualtyTotal = mciReports.reduce((sum, r) => sum + (r.casualtyEstimate ?? 0), 0);
    const alerts = alertsQ.data ?? [];
    const feed = feedQ.data ?? [];
    const hotspots = (hotspotsQ.data?.hotspots ?? []).slice(0, 4);
    const lowStock = (lowStockQ.data ?? []).slice(0, 4);
    const vs = volunteerStatsQ.data;

    const trendPoints = useMemo(() => {
        const data = trendQ.data;
        if (!data?.labels?.length || !data.datasets?.length) return [];
        return data.labels.map((_, i) => data.datasets.reduce((sum, ds) => sum + (ds.data?.[i] ?? 0), 0));
    }, [trendQ.data]);

    const lastUpdated = reportStatsQ.dataUpdatedAt
        ? new Date(reportStatsQ.dataUpdatedAt).toLocaleTimeString('zh-TW', { hour12: false })
        : null;

    const refreshAll = () => queryClient.invalidateQueries({ queryKey: ['cc'] });

    const renderReportRow = (report: Report) => {
        const meta = getDisasterTypeMeta(report.type);
        const sev = SEVERITY_BADGE[report.severity] ?? SEVERITY_BADGE.low;
        return (
            <li key={report.id} className="sit-row">
                <span className="sit-row__emoji" aria-hidden="true">{meta.emoji}</span>
                <div className="sit-row__main">
                    <div className="sit-row__title">{report.title}</div>
                    <div className="sit-row__meta">
                        {meta.label} · {STATUS_LABEL[report.status] ?? report.status}
                        {report.isMassCasualty && ' · 大量傷患'}
                    </div>
                </div>
                <Badge variant={sev.variant} size="sm" dot={sev.dot} pulse={sev.pulse}>{sev.label}</Badge>
                <time className="sit-row__time" dateTime={report.createdAt}>{formatTimeAgo(report.createdAt)}</time>
            </li>
        );
    };

    return (
        <PageWrapper pageId="command-center">
            <div className="cc-page">
                {/* ── 頁首（archetype §7：h1 ＋ 主要動作在右）── */}
                <header className="cc-header">
                    <div>
                        <h1 className="cc-title">戰情總覽</h1>
                        <p className="cc-subtitle">全域態勢一覽 · 每 30 秒自動更新</p>
                    </div>
                    <div className="cc-header__actions">
                        {lastUpdated && (
                            <span className="cc-updated" aria-live="polite">更新於 {lastUpdated}</span>
                        )}
                        <Button variant="secondary" size="sm" onClick={refreshAll}>重新整理</Button>
                        <Button variant="primary" size="sm" onClick={() => navigate('/intake')}>快速通報</Button>
                    </div>
                </header>

                <div className="cc-grid">
                    {/* ── KPI 列：通報 / 未處理 / 派遣 / 傷患 ── */}
                    <div className="cc-span-3">
                        <KpiCard
                            label="通報總數"
                            value={rs?.total ?? null}
                            icon={<FileText size={18} />}
                            tone="info"
                            sub={rs ? `已確認 ${rs.confirmed} 件 · 近 7 日趨勢` : undefined}
                            to="/events"
                            loading={reportStatsQ.isLoading}
                        >
                            {trendPoints.length > 1 && <Sparkline points={trendPoints} />}
                        </KpiCard>
                    </div>
                    <div className="cc-span-3">
                        <KpiCard
                            label="未處理通報"
                            value={rs?.pending ?? null}
                            icon={<AlertTriangle size={18} />}
                            tone={rs ? (rs.pending > 0 ? 'warning' : 'success') : 'default'}
                            sub={rs ? (rs.pending > 0 ? '待審核佇列累積中' : '審核佇列已清空') : undefined}
                            to="/events"
                            loading={reportStatsQ.isLoading}
                        />
                    </div>
                    <div className="cc-span-3">
                        <KpiCard
                            label="派遣中任務"
                            value={ts?.inProgress ?? null}
                            icon={<Truck size={18} />}
                            tone={ts ? (ts.overdue > 0 ? 'danger' : 'default') : 'default'}
                            sub={ts ? `逾期 ${ts.overdue} 件 · 待指派 ${ts.pending} 件` : undefined}
                            to="/tasks"
                            loading={taskStatsQ.isLoading}
                        />
                    </div>
                    <div className="cc-span-3">
                        <KpiCard
                            label="大量傷患事件"
                            value={mciQ.isLoading ? null : mciReports.length}
                            icon={<HeartPulse size={18} />}
                            tone={mciReports.length > 0 ? 'danger' : 'success'}
                            sub={mciReports.length > 0 ? `預估傷患 ${casualtyTotal} 人` : '目前無 MCI 事件'}
                            to="/rescue/triage"
                            loading={mciQ.isLoading}
                        />
                    </div>

                    {/* ── 活動警報（NCDR）── */}
                    <Panel
                        title="活動警報"
                        count={alertsQ.isSuccess ? alerts.length : undefined}
                        to="/hub/geo-alerts"
                        className="cc-span-8"
                    >
                        {alertsQ.isLoading ? (
                            <SkeletonRows />
                        ) : alertsQ.isError ? (
                            <EmptyState
                                variant="error"
                                title="無法載入警報"
                                description="NCDR 示警資料暫時無法取得。"
                                action={{ label: '重新載入', onClick: () => alertsQ.refetch() }}
                            />
                        ) : alerts.length === 0 ? (
                            <EmptyState
                                variant="minimal"
                                title="目前沒有生效中的警報"
                                description="NCDR 示警來源正常，無活動警報。"
                            />
                        ) : (
                            <ul className="sit-list">
                                {alerts.map(alert => {
                                    const badge = ALERT_BADGE[alert.severity] ?? ALERT_BADGE.info;
                                    return (
                                        <li key={alert.id} className="sit-row">
                                            <Badge variant={badge.variant} size="sm" dot pulse={alert.severity === 'critical'}>
                                                {badge.label}
                                            </Badge>
                                            <div className="sit-row__main">
                                                <div className="sit-row__title">{alert.title}</div>
                                                <div className="sit-row__meta">
                                                    {alert.alertTypeName}
                                                    {alert.affectedAreas ? ` · ${alert.affectedAreas}` : ''}
                                                    {alert.sourceUnit ? ` · ${alert.sourceUnit}` : ''}
                                                </div>
                                            </div>
                                            <time className="sit-row__time" dateTime={alert.publishedAt}>
                                                {formatTimeAgo(alert.publishedAt)}
                                            </time>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>

                    {/* ── 最新通報流 ── */}
                    <Panel
                        title="最新通報"
                        count={feedQ.isSuccess ? feed.length : undefined}
                        to="/events"
                        className="cc-span-4"
                    >
                        {feedQ.isLoading ? (
                            <SkeletonRows rows={4} />
                        ) : feedQ.isError ? (
                            <EmptyState
                                variant="error"
                                title="無法載入通報"
                                action={{ label: '重新載入', onClick: () => feedQ.refetch() }}
                            />
                        ) : feed.length === 0 ? (
                            <EmptyState variant="minimal" title="尚無通報" description="目前沒有任何通報紀錄。" />
                        ) : (
                            <ul className="sit-list">{feed.map(renderReportRow)}</ul>
                        )}
                    </Panel>

                    {/* ── 災情熱點縮覽（連往統一地圖）── */}
                    <Panel title="災情熱點" to="/geo/map" toLabel="開啟地圖" className="cc-span-4">
                        {hotspotsQ.isLoading ? (
                            <SkeletonRows />
                        ) : hotspotsQ.isError ? (
                            <EmptyState
                                variant="error"
                                title="無法載入熱點分析"
                                action={{ label: '重新載入', onClick: () => hotspotsQ.refetch() }}
                            />
                        ) : hotspots.length === 0 ? (
                            <EmptyState
                                variant="minimal"
                                title="近 7 日無災情熱點"
                                description="通報未形成地理聚集。"
                            />
                        ) : (
                            <ul className="sit-list">
                                {hotspots.map((h, i) => {
                                    const sev = SEVERITY_BADGE[h.severity] ?? SEVERITY_BADGE.low;
                                    return (
                                        <li key={h.gridId} className="sit-row">
                                            <span className="sit-row__emoji" aria-hidden="true"><MapPin size={18} /></span>
                                            <div className="sit-row__main">
                                                <div className="sit-row__title">熱點 {i + 1} · {h.count} 件通報</div>
                                                {h.recentReports?.[0] && (
                                                    <div className="sit-row__meta">{h.recentReports[0].title}</div>
                                                )}
                                            </div>
                                            <Badge variant={sev.variant} size="sm">{sev.label}</Badge>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>

                    {/* ── 資源水位 ── */}
                    <Panel title="資源水位" to="/logistics/inventory" className="cc-span-4">
                        {resourceStatsQ.isLoading ? (
                            <SkeletonRows />
                        ) : resourceStatsQ.isError || !resourceStatsQ.data ? (
                            <EmptyState
                                variant={resourceStatsQ.isError ? 'error' : 'minimal'}
                                title="無法取得物資統計"
                                action={{ label: '重新載入', onClick: () => resourceStatsQ.refetch() }}
                            />
                        ) : (
                            <>
                                <div className="sit-inline-stats">
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{resourceStatsQ.data.total}</span>
                                        <span className="sit-inline-stat__label">總品項</span>
                                    </div>
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{resourceStatsQ.data.lowStock}</span>
                                        <span className="sit-inline-stat__label">低庫存</span>
                                    </div>
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{resourceStatsQ.data.expiringSoon}</span>
                                        <span className="sit-inline-stat__label">即期品</span>
                                    </div>
                                </div>
                                {lowStock.length === 0 ? (
                                    <EmptyState variant="minimal" title="沒有低庫存物資" description="庫存皆在安全水位。" />
                                ) : (
                                    <ul className="sit-list">
                                        {lowStock.map(item => (
                                            <li key={item.id} className="sit-row">
                                                <div className="sit-row__main">
                                                    <div className="sit-row__title">{item.name}</div>
                                                    <div className="sit-row__meta">
                                                        剩餘 {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                                                    </div>
                                                </div>
                                                <Badge variant={item.status === 'depleted' ? 'danger' : 'warning'} size="sm">
                                                    {item.status === 'depleted' ? '告罄' : '低庫存'}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}
                    </Panel>

                    {/* ── 人力概況 ── */}
                    <Panel title="人力概況" to="/workforce/people" className="cc-span-4">
                        {volunteerStatsQ.isLoading ? (
                            <SkeletonRows />
                        ) : volunteerStatsQ.isError || !vs ? (
                            <EmptyState
                                variant={volunteerStatsQ.isError ? 'error' : 'minimal'}
                                title="無法取得人力統計"
                                action={{ label: '重新載入', onClick: () => volunteerStatsQ.refetch() }}
                            />
                        ) : (
                            <>
                                <div className="sit-inline-stats">
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{vs.available}</span>
                                        <span className="sit-inline-stat__label">可動員</span>
                                    </div>
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{vs.busy}</span>
                                        <span className="sit-inline-stat__label">出勤中</span>
                                    </div>
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{vs.offline}</span>
                                        <span className="sit-inline-stat__label">離線</span>
                                    </div>
                                    <div className="sit-inline-stat">
                                        <span className="sit-inline-stat__value">{vs.total}</span>
                                        <span className="sit-inline-stat__label">總人數</span>
                                    </div>
                                </div>
                                <ProgressBar
                                    label="可動員率"
                                    value={vs.available}
                                    max={Math.max(vs.total, 1)}
                                    variant="success"
                                    animated={false}
                                />
                            </>
                        )}
                    </Panel>
                </div>
            </div>
        </PageWrapper>
    );
}
