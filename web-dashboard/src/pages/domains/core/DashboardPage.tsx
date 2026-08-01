/**
 * DashboardPage.tsx — 核心儀表板 R2a / FE-7 重設計（依角色分層，DESIGN_LANGUAGE §5）
 *
 * 資訊架構：
 * - L0–L1 志工「我的工作台」——回答「我現在要做什麼？」
 *   快速捷徑（通報／任務／排班／地圖，皆 1 次點擊）＋「我的任務」清單。
 *   極簡、行動優先；不給營運統計（志工不需要，也看不懂佇列水位）。
 * - L2+ 幹部「營運總覽」——回答「組織平時運轉是否健康？」
 *   任務吞吐、人力能量、審核待辦、物資整備。
 *   與 /command-center（災時態勢：警報/熱點/通報流）明確區隔——本頁是
 *   「平時整備」視角，不重複 COP 牆的內容。
 *
 * 舊版問題：整頁靜態假資料＋大量 no-op Tailwind class（bento-*）——
 * 本次全部改為 DESIGN_LANGUAGE 正規做法：語義 token、design-system 原子、
 * EmptyState 明示缺資料、真實 API（api/services ＋ react-query）。
 */
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FileWarning,
    ClipboardList,
    Calendar,
    Map,
    ChevronRight,
    Truck,
    AlertTriangle,
    Users,
    Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    getTaskKanban,
    getTaskStats,
    getTasks,
    getReportStats,
    getVolunteerStats,
    getResourceStats,
    getPendingVolunteerCount,
} from '../../../api/services';
import type { Task } from '../../../api/services';
import { Badge, ProgressBar } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { useAuth } from '../../../context/AuthContext';
import type { User } from '../../../context/AuthContext';
import { KpiCard, Panel, SkeletonRows, formatTimeAgo } from '../../situational/SituationalPrimitives';
import './DashboardPage.css';

/* ── 任務狀態 → Badge 語意（§3）── */
function taskStatusBadge(status: string) {
    switch (status) {
        case 'in_progress':
        case 'inProgress':
        case 'in-progress':
            return { label: '進行中', variant: 'info' as const };
        case 'completed':
        case 'done':
            return { label: '已完成', variant: 'success' as const };
        case 'blocked':
            return { label: '受阻', variant: 'warning' as const };
        case 'pending':
        default:
            return { label: '待處理', variant: 'default' as const };
    }
}

function TaskRow({ task, statusOverride }: { task: Task; statusOverride?: string }) {
    const badge = taskStatusBadge(statusOverride ?? task.status);
    return (
        <li className="sit-row">
            <div className="sit-row__main">
                <div className="sit-row__title">{task.title}</div>
                <div className="sit-row__meta">
                    {task.dueAt
                        ? `期限 ${new Date(task.dueAt).toLocaleString('zh-TW', {
                            hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}`
                        : '無期限'}
                </div>
            </div>
            <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
            <time className="sit-row__time" dateTime={task.createdAt}>{formatTimeAgo(task.createdAt)}</time>
        </li>
    );
}

/* ═══ L0–L1：志工「我的工作台」═══ */

const VOLUNTEER_SHORTCUTS: Array<{ to: string; icon: LucideIcon; label: string; desc: string }> = [
    { to: '/intake', icon: FileWarning, label: '快速通報', desc: '回報災情或異常' },
    { to: '/tasks', icon: ClipboardList, label: '任務看板', desc: '查看並認領任務' },
    { to: '/workforce/shifts', icon: Calendar, label: '排班日曆', desc: '查看班表與簽到' },
    { to: '/geo/map', icon: Map, label: '統一地圖', desc: '掌握周邊狀況' },
];

function VolunteerHome({ user }: { user: User | null }) {
    const navigate = useNavigate();

    const kanbanQ = useQuery({
        queryKey: ['dash', 'taskKanban'],
        queryFn: () => getTaskKanban().then(r => r.data?.data ?? null),
        refetchInterval: 60_000,
    });

    // assignedTo 可能存 user id 或顯示名稱——兩者都比對，比不到就明示空狀態
    const myTasks = useMemo(() => {
        const k = kanbanQ.data;
        if (!k || !user) return [];
        const isMine = (t: Task) =>
            !!t.assignedTo && (t.assignedTo === user.id || t.assignedTo === user.displayName);
        return [
            ...(k.inProgress ?? []).filter(isMine).map(t => ({ task: t, status: 'in_progress' })),
            ...(k.pending ?? []).filter(isMine).map(t => ({ task: t, status: 'pending' })),
        ].slice(0, 6);
    }, [kanbanQ.data, user]);

    return (
        <div className="dash-page" data-view="volunteer">
            <header className="dash-header">
                <div>
                    <h1 className="dash-title">我的工作台</h1>
                    <p className="dash-subtitle">
                        {user?.displayName ? `你好，${user.displayName}。` : '你好。'}今天需要做什麼？
                    </p>
                </div>
            </header>

            {/* 快速捷徑：關鍵動作 1 次點擊（§6 單手原則、大觸控目標） */}
            <nav className="dash-shortcuts" aria-label="快速捷徑">
                {VOLUNTEER_SHORTCUTS.map(({ to, icon: Icon, label, desc }) => (
                    <Link key={to} to={to} className="dash-shortcut">
                        <span className="dash-shortcut__icon" aria-hidden="true"><Icon size={24} /></span>
                        <span className="dash-shortcut__label">{label}</span>
                        <span className="dash-shortcut__desc">{desc}</span>
                    </Link>
                ))}
            </nav>

            <Panel title="我的任務" count={kanbanQ.isSuccess ? myTasks.length : undefined} to="/tasks" toLabel="任務看板">
                {kanbanQ.isLoading ? (
                    <SkeletonRows />
                ) : kanbanQ.isError ? (
                    <EmptyState
                        variant="error"
                        title="無法載入任務"
                        action={{ label: '重新載入', onClick: () => kanbanQ.refetch() }}
                    />
                ) : myTasks.length === 0 ? (
                    <EmptyState
                        variant="minimal"
                        title="目前沒有指派給你的任務"
                        description="可到任務看板認領開放任務。"
                        action={{ label: '前往任務看板', onClick: () => navigate('/tasks') }}
                    />
                ) : (
                    <ul className="sit-list">
                        {myTasks.map(({ task, status }) => (
                            <TaskRow key={task.id} task={task} statusOverride={status} />
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}

/* ═══ L2+：幹部「營運總覽」═══ */

function OpsOverview() {
    const taskStatsQ = useQuery({
        queryKey: ['dash', 'taskStats'],
        queryFn: () => getTaskStats().then(r => r.data?.data ?? null),
        refetchInterval: 60_000,
    });
    const reportStatsQ = useQuery({
        queryKey: ['dash', 'reportStats'],
        queryFn: () => getReportStats().then(r => r.data?.data ?? null),
        refetchInterval: 60_000,
    });
    const volunteerStatsQ = useQuery({
        queryKey: ['dash', 'volunteerStats'],
        queryFn: () => getVolunteerStats().then(r => r.data?.data ?? null),
        refetchInterval: 60_000,
    });
    const resourceStatsQ = useQuery({
        queryKey: ['dash', 'resourceStats'],
        queryFn: () => getResourceStats().then(r => r.data?.data ?? null),
        refetchInterval: 60_000,
    });
    const pendingVolQ = useQuery({
        queryKey: ['dash', 'pendingVolunteers'],
        queryFn: () => getPendingVolunteerCount().then(r => r.data?.data?.count ?? null),
        refetchInterval: 60_000,
    });
    const recentTasksQ = useQuery({
        queryKey: ['dash', 'recentTasks'],
        queryFn: () => getTasks({ limit: 5 }).then(r => r.data?.data ?? []),
        refetchInterval: 60_000,
    });

    const ts = taskStatsQ.data;
    const rs = reportStatsQ.data;
    const vs = volunteerStatsQ.data;
    const res = resourceStatsQ.data;
    const pendingVol = pendingVolQ.data;
    const recentTasks = recentTasksQ.data ?? [];

    const taskTotal = ts ? ts.pending + ts.inProgress + ts.completed : 0;
    const completionRate = ts && taskTotal > 0 ? Math.round((ts.completed / taskTotal) * 100) : null;

    /* 整備待辦：全部載入且全為 0 才顯示「沒有待辦」 */
    const todos = [
        {
            key: 'pending-vol',
            label: '待審核志工',
            count: pendingVol,
            to: '/workforce/people',
            icon: Users,
        },
        {
            key: 'pending-report',
            label: '待審核通報',
            count: rs?.pending ?? null,
            to: '/events',
            icon: FileWarning,
        },
        {
            key: 'low-stock',
            label: '低庫存物資',
            count: res?.lowStock ?? null,
            to: '/logistics/inventory',
            icon: Package,
        },
        {
            key: 'expiring',
            label: '即期物資',
            count: res?.expiringSoon ?? null,
            to: '/logistics/inventory',
            icon: AlertTriangle,
        },
    ];
    const todosLoaded = todos.every(t => typeof t.count === 'number');
    const activeTodos = todos.filter(t => typeof t.count === 'number' && (t.count as number) > 0);

    return (
        <div className="dash-page" data-view="ops">
            <header className="dash-header">
                <div>
                    <h1 className="dash-title">營運總覽</h1>
                    <p className="dash-subtitle">平時整備與組織運轉狀態（災時態勢請看戰情總覽）</p>
                </div>
                <Link className="dash-header__link" to="/command-center">前往戰情總覽 →</Link>
            </header>

            <div className="dash-grid">
                {/* ── KPI 列 ── */}
                <div className="dash-span-3">
                    <KpiCard
                        label="進行中任務"
                        value={ts?.inProgress ?? null}
                        icon={<Truck size={18} />}
                        tone={ts ? (ts.overdue > 0 ? 'danger' : 'default') : 'default'}
                        sub={ts ? `逾期 ${ts.overdue} 件` : undefined}
                        to="/tasks"
                        loading={taskStatsQ.isLoading}
                    />
                </div>
                <div className="dash-span-3">
                    <KpiCard
                        label="待審核通報"
                        value={rs?.pending ?? null}
                        icon={<AlertTriangle size={18} />}
                        tone={rs ? (rs.pending > 0 ? 'warning' : 'success') : 'default'}
                        sub={rs ? `累計通報 ${rs.total} 件` : undefined}
                        to="/events"
                        loading={reportStatsQ.isLoading}
                    />
                </div>
                <div className="dash-span-3">
                    <KpiCard
                        label="可動員志工"
                        value={vs?.available ?? null}
                        icon={<Users size={18} />}
                        tone="success"
                        sub={vs ? `總人數 ${vs.total} 人` : undefined}
                        to="/workforce/people"
                        loading={volunteerStatsQ.isLoading}
                    />
                </div>
                <div className="dash-span-3">
                    <KpiCard
                        label="低庫存物資"
                        value={res?.lowStock ?? null}
                        icon={<Package size={18} />}
                        tone={res ? (res.lowStock > 0 ? 'warning' : 'success') : 'default'}
                        sub={res ? `即期品 ${res.expiringSoon} 項` : undefined}
                        to="/logistics/inventory"
                        loading={resourceStatsQ.isLoading}
                    />
                </div>

                {/* ── 任務概況 ── */}
                <Panel title="任務概況" to="/tasks" className="dash-span-6">
                    {taskStatsQ.isLoading ? (
                        <SkeletonRows />
                    ) : taskStatsQ.isError || !ts ? (
                        <EmptyState
                            variant={taskStatsQ.isError ? 'error' : 'minimal'}
                            title="無法取得任務統計"
                            action={{ label: '重新載入', onClick: () => taskStatsQ.refetch() }}
                        />
                    ) : (
                        <>
                            <div className="sit-inline-stats">
                                <div className="sit-inline-stat">
                                    <span className="sit-inline-stat__value">{ts.pending}</span>
                                    <span className="sit-inline-stat__label">待指派</span>
                                </div>
                                <div className="sit-inline-stat">
                                    <span className="sit-inline-stat__value">{ts.inProgress}</span>
                                    <span className="sit-inline-stat__label">進行中</span>
                                </div>
                                <div className="sit-inline-stat">
                                    <span className="sit-inline-stat__value">{ts.completed}</span>
                                    <span className="sit-inline-stat__label">已完成</span>
                                </div>
                                <div className="sit-inline-stat">
                                    <span className="sit-inline-stat__value">{ts.overdue}</span>
                                    <span className="sit-inline-stat__label">逾期</span>
                                </div>
                            </div>
                            {completionRate !== null && (
                                <ProgressBar
                                    label="完成率"
                                    value={completionRate}
                                    variant={completionRate >= 70 ? 'success' : 'default'}
                                    animated={false}
                                />
                            )}
                            {recentTasks.length > 0 && (
                                <ul className="sit-list dash-recent-tasks">
                                    {recentTasks.map(task => (
                                        <TaskRow key={task.id} task={task} />
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </Panel>

                {/* ── 人力能量 ── */}
                <Panel title="人力能量" to="/workforce/people" className="dash-span-6">
                    {volunteerStatsQ.isLoading ? (
                        <SkeletonRows />
                    ) : volunteerStatsQ.isError || !vs ? (
                        <EmptyState
                            variant={volunteerStatsQ.isError ? 'error' : 'minimal'}
                            title="無法取得志工統計"
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
                                    <span className="sit-inline-stat__value">{vs.totalServiceHours}</span>
                                    <span className="sit-inline-stat__label">總服務時數</span>
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

                {/* ── 整備待辦 ── */}
                <Panel title="整備待辦" count={todosLoaded ? activeTodos.length : undefined} className="dash-span-12">
                    {todosLoaded && activeTodos.length === 0 ? (
                        <EmptyState
                            variant="minimal"
                            title="目前沒有整備待辦"
                            description="審核佇列與庫存皆在正常水位。"
                        />
                    ) : (
                        <ul className="sit-list">
                            {(todosLoaded ? activeTodos : todos).map(({ key, label, count, to, icon: Icon }) => (
                                <li key={key}>
                                    <Link to={to} className="sit-row dash-todo">
                                        <span className="dash-todo__icon" aria-hidden="true"><Icon size={18} /></span>
                                        <div className="sit-row__main">
                                            <div className="sit-row__title">{label}</div>
                                        </div>
                                        <Badge
                                            variant={typeof count === 'number' && count > 0 ? 'warning' : 'default'}
                                            size="sm"
                                        >
                                            {typeof count === 'number' ? `${count} 件` : '—'}
                                        </Badge>
                                        <ChevronRight size={16} className="dash-todo__chevron" aria-hidden="true" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
        </div>
    );
}

/* ═══ 入口：依角色分層（§5——志工極簡殼 / 管理密度殼）═══ */

export default function DashboardPage() {
    const { user } = useAuth();
    const level = user?.roleLevel ?? 0;
    return level >= 2 ? <OpsOverview /> : <VolunteerHome user={user} />;
}
