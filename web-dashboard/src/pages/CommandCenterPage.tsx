/**
 * CommandCenterPage.tsx — 戰情總覽（COP 態勢牆）R5/T2 B3c 戰術化
 *
 * 構圖依 owner 核准的 c1 稿（public/design-mockups/r5-b3c-deep.html）：
 *   ① 頂部任務條：徽記＋LIGHTKEEPERS＋任務代號/狀態＋ELAPSED mono 大時鐘
 *      ＋橄欖 CTA「快速通報」。任務來源＝EmergencyContext 的進行中事件
 *      （最高災級者）；無事件時以「今日」值守代替代號、以本次上線持續
 *      時間當 ELAPSED——全部真實資料，不寫死假任務。
 *   ② 統計卡加 mono 編號 01–04；「待處理」有件時上緣掛卡其斜紋（hot）。
 *   ③ 佇列列以 ■/□/✓ 形狀＋chip 雙編碼（MIL-STD-2525 精神：形狀先於顏色，
 *      色盲安全）；紅色依 v2 §D 憲法不進一般佇列。
 *   ④ 底部系統狀態列：模式／圖例／同步狀態／OUTBOX／版本／最後同步——
 *      同步與 outbox 接既有離線層（useSyncStatus），版本取 Vite build MODE。
 *
 * 資料接線與 R2a 相同：一律 src/api/services ＋ react-query（30 秒輪詢）；
 * 後端缺資料的區塊以 EmptyState 明示，不擺假資料。災時模式
 * （data-app-mode="emergency"）僅由 CSS 收緊密度（字級 -1、間距 -25%）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { ReportIcon, WarningIcon, TasksIcon, TriageIcon } from '../design-system/icons';
import { SolidSquareStamp, OutlineSquareStamp, CheckStamp } from '../design-system/icons/pictograms';
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
import { Button, ProgressBar } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import PageWrapper from '../components/layout/PageWrapper';
import { useAppMode } from '../components/layout/useAppMode';
import { useEmergencyContext } from '../context/useEmergencyContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { getDisasterTypeMeta } from '../constants/disasterTypes';
import { KpiCard, Panel, SkeletonRows, Sparkline, formatTimeAgo } from './situational/SituationalPrimitives';
import './CommandCenterPage.css';

const REFRESH_MS = 30_000;

type ChipTone = 'hi' | 'md' | 'lo';
interface ChipSpec {
    label: string;
    /** ■＝實心（高張力）、□＝描邊（中低張力）；✓ 另供完成態 */
    shape: '■' | '□';
    tone: ChipTone;
}

/** 通報嚴重度 → ■/□ 形狀＋chip 雙編碼（c1 稿 TRIAGE FEED 樣式） */
const SEVERITY_CHIP: Record<ReportSeverity, ChipSpec> = {
    low: { label: '輕微', shape: '□', tone: 'lo' },
    medium: { label: '中等', shape: '□', tone: 'md' },
    high: { label: '嚴重', shape: '■', tone: 'hi' },
    critical: { label: '緊急', shape: '■', tone: 'hi' },
};

const STATUS_LABEL: Record<ReportStatus, string> = {
    pending: '待審核',
    confirmed: '已確認',
    rejected: '已退回',
};

/** NCDR 警報等級 → ■/□ chip 對照 */
const ALERT_CHIP: Record<NcdrAlert['severity'], ChipSpec> = {
    critical: { label: '危急', shape: '■', tone: 'hi' },
    warning: { label: '警戒', shape: '□', tone: 'md' },
    info: { label: '資訊', shape: '□', tone: 'lo' },
};

/** 佇列列狀態 chip：■ 實心／□ 描邊雙編碼（形狀先於顏色；R5/T5 章元件渲染） */
function Chip({ shape, tone, children }: { shape: ChipSpec['shape']; tone: ChipTone; children: ReactNode }) {
    const ShapeStamp = shape === '■' ? SolidSquareStamp : OutlineSquareStamp;
    return (
        <span className={`cc-chip cc-chip--${tone}`}>
            <i className="cc-chip__shape" aria-hidden="true"><ShapeStamp size={10} /></i>
            {children}
        </span>
    );
}

/** 任務條徽記（c1 稿 seal；描邊 currentColor，顏色由 CSS token 決定） */
function MissionSeal() {
    return (
        <span className="cc-mission__seal" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" focusable="false">
                <path d="M12 2.1 13.7 4.5H10.3Z" fill="currentColor" />
                <rect x="10.1" y="4.9" width="3.8" height="2.8" fill="currentColor" />
                <path d="M9.9 8.6h4.2L15.4 20H8.6Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 12.9h6M8.4 16.4h7.2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8.8 6.3 5.1 4.9M15.2 6.3l3.7-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                <path d="M6.4 20.9h11.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        </span>
    );
}

/** 毫秒 → HH:MM:SS（超過 24 小時累計進時位；tabular-nums 不跳動） */
function formatElapsed(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(totalSec / 3600))}:${pad(Math.floor((totalSec % 3600) / 60))}:${pad(totalSec % 60)}`;
}

export default function CommandCenterPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isEmergencyMode } = useAppMode();
    const { activeIncidents, currentIncident } = useEmergencyContext();
    const { isOnline, isSyncing, pendingChanges, lastSyncAt } = useSyncStatus();

    // ── 任務條：EmergencyContext 事件＝任務；無事件＝「今日」值守 ──
    const mission = useMemo(() => {
        if (currentIncident) return currentIncident;
        if (activeIncidents.length === 0) return null;
        return activeIncidents.reduce((top, i) => (i.level > top.level ? i : top), activeIncidents[0]);
    }, [currentIncident, activeIncidents]);

    // ELAPSED：有任務＝事件開始至今；平時＝本次上線（本頁掛載）至今
    const sessionStartRef = useRef(Date.now());
    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const elapsedFrom = mission ? new Date(mission.startTime).getTime() : sessionStartRef.current;
    const elapsedLabel = formatElapsed(nowTs - elapsedFrom);
    const missionCode = mission
        ? mission.title
        : new Date(nowTs).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

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

    // ── ④ 系統狀態列讀數（接既有離線層；不造資料） ──
    const syncText = !isOnline ? '離線模式' : isSyncing ? '同步中' : pendingChanges > 0 ? '待同步' : '系統正常';
    const syncCode = !isOnline ? 'OFFLINE' : isSyncing ? 'SYNCING' : pendingChanges > 0 ? 'PENDING' : 'SYS NOMINAL';
    const lastSyncLabel = lastSyncAt
        ? new Date(lastSyncAt).toLocaleTimeString('zh-TW', { hour12: false })
        : '從未同步';
    const buildChannel = String(import.meta.env.MODE ?? 'dev').toUpperCase();

    const renderReportRow = (report: Report) => {
        const meta = getDisasterTypeMeta(report.type);
        const sev = SEVERITY_CHIP[report.severity] ?? SEVERITY_CHIP.low;
        const done = report.status === 'confirmed';
        return (
            <li key={report.id} className={`sit-row${done ? ' cc-row--done' : ''}`}>
                <Chip shape={sev.shape} tone={sev.tone}>{sev.label}</Chip>
                <div className="sit-row__main">
                    <div className="sit-row__title">{report.title}</div>
                    <div className="sit-row__meta">
                        {meta.label} · {done && <i className="cc-done-mark" aria-hidden="true"><CheckStamp size={11} /></i>}
                        {STATUS_LABEL[report.status] ?? report.status}
                        {report.isMassCasualty && ' · 大量傷患'}
                    </div>
                </div>
                <time className="sit-row__time" dateTime={report.createdAt}>{formatTimeAgo(report.createdAt)}</time>
            </li>
        );
    };

    return (
        <PageWrapper pageId="command-center">
            <div className="cc-page">
                {/* ── ① 任務條（c1-top：徽記＋番號＋任務＋ELAPSED＋CTA）── */}
                <header className="cc-mission">
                    <div className="cc-mission__id">
                        <MissionSeal />
                        <div className="cc-mission__brand">
                            <b className="u-stencil cc-mission__wordmark">LIGHTKEEPERS</b>
                            <h1 className="cc-title">戰情總覽</h1>
                        </div>
                    </div>
                    <div className="cc-mission__meters">
                        <div className="cc-mission__op">
                            <span className="cc-mission__lbl">
                                {mission ? '任務' : '今日'}
                                <b className="u-stencil">{mission ? 'MISSION' : 'TODAY'}</b>
                            </span>
                            <div className="cc-mission__row">
                                <b className={`cc-mission__code${mission ? '' : ' u-mono'}`}>{missionCode}</b>
                                <span className={`cc-mission__state${mission ? ' cc-mission__state--live' : ''}`}>
                                    <i aria-hidden="true">
                                        {mission ? <SolidSquareStamp size={10} /> : <OutlineSquareStamp size={10} />}
                                    </i>
                                    {mission ? '進行中' : '值守'}
                                </span>
                            </div>
                        </div>
                        <span className="cc-mission__vr" aria-hidden="true" />
                        <div className="cc-mission__clock">
                            <span className="cc-mission__lbl">
                                {mission ? '已持續' : '上線'}
                                <b className="u-stencil">ELAPSED</b>
                            </span>
                            <strong className="u-mono cc-mission__elapsed">{elapsedLabel}</strong>
                        </div>
                    </div>
                    <div className="cc-mission__actions">
                        {lastUpdated && (
                            <span className="cc-updated u-mono" aria-live="polite">更新於 {lastUpdated}</span>
                        )}
                        <Button variant="secondary" size="sm" onClick={refreshAll}>重新整理</Button>
                        <Button
                            variant="primary"
                            size="sm"
                            className="cc-cta"
                            icon={<ReportIcon size={16} />}
                            onClick={() => navigate('/intake')}
                        >
                            快速通報
                        </Button>
                    </div>
                </header>

                <div className="cc-grid">
                    {/* ── ② KPI 列：mono 編號 01–04；待處理有件時掛 hot 斜紋 ── */}
                    <div className="cc-span-3">
                        <KpiCard
                            label="通報總數"
                            value={rs?.total ?? null}
                            icon={<ReportIcon size={18} />}
                            tone="info"
                            sub={rs ? `已確認 ${rs.confirmed} 件 · 近 7 日趨勢` : undefined}
                            to="/events"
                            loading={reportStatsQ.isLoading}
                        >
                            <span className="cc-kpi-idx" aria-hidden="true">01</span>
                            {trendPoints.length > 1 && <Sparkline points={trendPoints} />}
                        </KpiCard>
                    </div>
                    <div className={`cc-span-3${rs && rs.pending > 0 ? ' cc-kpi-hot' : ''}`}>
                        <KpiCard
                            label="未處理通報"
                            value={rs?.pending ?? null}
                            icon={<WarningIcon size={18} />}
                            tone={rs ? (rs.pending > 0 ? 'warning' : 'success') : 'default'}
                            sub={rs ? (rs.pending > 0 ? '待審核佇列累積中' : '審核佇列已清空') : undefined}
                            to="/events"
                            loading={reportStatsQ.isLoading}
                        >
                            <span className="cc-kpi-idx" aria-hidden="true">02</span>
                        </KpiCard>
                    </div>
                    <div className="cc-span-3">
                        <KpiCard
                            label="派遣中任務"
                            value={ts?.inProgress ?? null}
                            icon={<TasksIcon size={18} />}
                            tone={ts ? (ts.overdue > 0 ? 'danger' : 'default') : 'default'}
                            sub={ts ? `逾期 ${ts.overdue} 件 · 待指派 ${ts.pending} 件` : undefined}
                            to="/tasks"
                            loading={taskStatsQ.isLoading}
                        >
                            <span className="cc-kpi-idx" aria-hidden="true">03</span>
                        </KpiCard>
                    </div>
                    <div className="cc-span-3">
                        <KpiCard
                            label="大量傷患事件"
                            value={mciQ.isLoading ? null : mciReports.length}
                            icon={<TriageIcon size={18} />}
                            tone={mciReports.length > 0 ? 'danger' : 'success'}
                            sub={mciReports.length > 0 ? `預估傷患 ${casualtyTotal} 人` : '目前無 MCI 事件'}
                            to="/rescue/triage"
                            loading={mciQ.isLoading}
                        >
                            <span className="cc-kpi-idx" aria-hidden="true">04</span>
                        </KpiCard>
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
                                    const chip = ALERT_CHIP[alert.severity] ?? ALERT_CHIP.info;
                                    return (
                                        <li key={alert.id} className="sit-row">
                                            <Chip shape={chip.shape} tone={chip.tone}>{chip.label}</Chip>
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
                                    const sev = SEVERITY_CHIP[h.severity] ?? SEVERITY_CHIP.low;
                                    return (
                                        <li key={h.gridId} className="sit-row">
                                            <span className="sit-row__emoji" aria-hidden="true"><MapPin size={18} /></span>
                                            <div className="sit-row__main">
                                                <div className="sit-row__title">熱點 {i + 1} · {h.count} 件通報</div>
                                                {h.recentReports?.[0] && (
                                                    <div className="sit-row__meta">{h.recentReports[0].title}</div>
                                                )}
                                            </div>
                                            <Chip shape={sev.shape} tone={sev.tone}>{sev.label}</Chip>
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
                                                <Chip
                                                    shape={item.status === 'depleted' ? '■' : '□'}
                                                    tone={item.status === 'depleted' ? 'hi' : 'md'}
                                                >
                                                    {item.status === 'depleted' ? '告罄' : '低庫存'}
                                                </Chip>
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

                {/* ── ④ 系統狀態列（c1-foot：模式／圖例／同步／OUTBOX／版本）── */}
                <footer className="cc-sysbar" aria-label="系統狀態">
                    <span className="cc-sysbar__seg">
                        <i className="cc-sysbar__glyph" aria-hidden="true">
                            {isEmergencyMode ? <SolidSquareStamp size={10} /> : <OutlineSquareStamp size={10} />}
                        </i>
                        {isEmergencyMode ? '災時模式' : '平時模式'}
                        <b className="u-stencil cc-sysbar__code">{isEmergencyMode ? 'TACTICAL' : 'STANDBY'}</b>
                    </span>
                    <span className="cc-sysbar__seg cc-sysbar__legend">
                        圖例 <i aria-hidden="true"><SolidSquareStamp size={10} /></i> 高
                        · <i aria-hidden="true"><OutlineSquareStamp size={10} /></i> 中
                        · <i aria-hidden="true"><CheckStamp size={10} /></i> 完成
                    </span>
                    <span className="cc-sysbar__seg">
                        {syncText}
                        <b className="u-stencil cc-sysbar__code">{syncCode}</b>
                    </span>
                    <span className="cc-sysbar__seg">
                        <b className="u-stencil cc-sysbar__code">OUTBOX</b>
                        <b className="u-mono cc-sysbar__num">{pendingChanges}</b>
                    </span>
                    <span className="cc-sysbar__seg">
                        版本
                        <b className="u-stencil cc-sysbar__code">{buildChannel}</b>
                    </span>
                    <span className="cc-sysbar__seg cc-sysbar__seg--end">
                        最後同步 <time className="u-mono">{lastSyncLabel}</time>
                    </span>
                </footer>
            </div>
        </PageWrapper>
    );
}
