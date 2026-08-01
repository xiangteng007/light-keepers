/**
 * EmergencyResponsePage — 緊急應變工作檯（R2b 重設計）
 *
 * 與 CommandCenter 的分工（DESIGN_LANGUAGE §1 雙模式 IA）：
 *   CommandCenter（/command-center）＝「看態勢」：儀表板、總覽、監看。
 *   EmergencyResponse＝「做應變」：發起/結束應變場次、派遣捷徑、
 *   任務與事件的行動入口。本頁是行動導向工作檯，不再放觀察性 KPI 牆。
 *
 * 重設計要點：
 * - 版型以「詳情頁」archetype 為基底：header（標題＋主要動作）→
 *   進行中場次工作檯（快速動作 ≥44px 大按鈕）→ 場次歷史清單。
 * - 資料層改走統一 api client（原為裸 axios + 手撕 token，且漏掉
 *   /api/v1 前綴）＋ react-query。
 * - 結束任務為不可逆操作：ConfirmModal 模式（§4）取代 window.confirm。
 * - 自刻 modal/btn/badge 全數換 design-system（§4 元件層級）。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ClipboardList, FileText, LineChart, Map as MapIcon, Plus,
    Radio, Siren, SquareCheckBig, StopCircle,
} from 'lucide-react';
import { Badge, Button, Card, Modal } from '../design-system';
import type { BadgeProps } from '../design-system';
import api from '../api/client';
import './EmergencyResponsePage.css';

// ===== 型別 =====

interface MissionSession {
    id: string;
    title: string;
    status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled';
    commanderName?: string;
    createdAt: string;
    startedAt?: string;
}

interface SessionStats {
    sessionId: string;
    status: string;
    eventsCount: number;
    tasksCount: number;
    completedTasksCount: number;
    duration: number;
}

const STATUS_TEXT: Record<MissionSession['status'], string> = {
    preparing: '準備中',
    active: '進行中',
    paused: '已暫停',
    completed: '已完成',
    cancelled: '已取消',
};

const STATUS_BADGE: Record<MissionSession['status'], BadgeProps['variant']> = {
    preparing: 'warning',
    active: 'danger',
    paused: 'default',
    completed: 'success',
    cancelled: 'default',
};

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// ===== 頁面 =====

export default function EmergencyResponsePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);

    // ===== 查詢 =====
    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['missionSessions'],
        queryFn: () => api.get<MissionSession[]>('/mission-sessions').then(r => r.data),
    });

    const activeSession = useMemo(
        () => sessions.find(s => s.status === 'active') ?? null,
        [sessions],
    );

    const { data: stats } = useQuery({
        queryKey: ['missionSessionStats', activeSession?.id],
        queryFn: () => api
            .get<SessionStats>(`/mission-sessions/${activeSession!.id}/stats`)
            .then(r => r.data),
        enabled: !!activeSession,
        refetchInterval: 30_000, // 持續時間/進度每 30s 更新
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['missionSessions'] });

    // ===== 動作 =====
    const createSession = useMutation({
        mutationFn: (title: string) => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return api.post('/mission-sessions', {
                title,
                status: 'preparing',
                commanderName: user.displayName || user.email,
            });
        },
        onSuccess: () => {
            setNewSessionTitle('');
            setShowCreateModal(false);
            setActionError(null);
            invalidate();
        },
        onError: () => setActionError('建立任務失敗，請稍後再試'),
    });

    const startSession = useMutation({
        mutationFn: (sessionId: string) => api.post(`/mission-sessions/${sessionId}/start`, {}),
        onSuccess: () => { setActionError(null); invalidate(); },
        onError: () => setActionError('啟動任務失敗，請稍後再試'),
    });

    const endSession = useMutation({
        mutationFn: (sessionId: string) => api.post(`/mission-sessions/${sessionId}/end`, {}),
        onSuccess: () => {
            setShowEndConfirm(false);
            setActionError(null);
            invalidate();
        },
        onError: () => setActionError('結束任務失敗，請稍後再試'),
    });

    // 工作檯快速動作（做應變的手）
    const quickActions = activeSession ? [
        { icon: MapIcon, label: 'COP 地圖', to: `/emergency-response/map/${activeSession.id}` },
        { icon: Radio, label: '指揮中心', to: `/mission-command/${activeSession.id}` },
        { icon: FileText, label: '作戰計畫', to: `/emergency-response/iap/${activeSession.id}` },
        { icon: LineChart, label: '情勢報告', to: `/emergency-response/sitrep/${activeSession.id}` },
        { icon: Siren, label: '查看事件', to: `/emergency-response/${activeSession.id}/events` },
        { icon: ClipboardList, label: '任務管理', to: `/emergency-response/${activeSession.id}/tasks` },
    ] : [];

    if (isLoading) {
        return (
            <div className="page er-page">
                <div className="er-loading">載入中...</div>
            </div>
        );
    }

    return (
        <div className="page er-page">
            {/* ===== Header：標題 + 分工說明 + 主要動作 ===== */}
            <header className="er-page__header">
                <div className="er-page__header-text">
                    <h2>緊急應變</h2>
                    <p className="er-page__subtitle">
                        發起與執行應變場次（派遣／任務／回報）。
                        看整體態勢請至
                        <button
                            type="button"
                            className="er-page__link"
                            onClick={() => navigate('/command-center')}
                        >
                            戰情儀表板
                        </button>
                    </p>
                </div>
                <Button size="lg" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} aria-hidden="true" /> 發起應變任務
                </Button>
            </header>

            {actionError && (
                <div className="er-error" role="alert">{actionError}</div>
            )}

            {/* ===== 進行中場次：應變工作檯 ===== */}
            {activeSession ? (
                <section className="er-workbench" aria-label="進行中應變場次">
                    <div className="er-workbench__head">
                        <div className="er-workbench__title">
                            <Badge variant="danger" dot pulse>進行中</Badge>
                            <h3>{activeSession.title}</h3>
                        </div>
                        <p className="er-workbench__meta">
                            指揮官：{activeSession.commanderName || '未指定'}
                        </p>
                    </div>

                    {stats && (
                        <dl className="er-workbench__stats">
                            <div className="er-stat">
                                <dt>持續時間</dt>
                                <dd>{formatDuration(stats.duration)}</dd>
                            </div>
                            <div className="er-stat">
                                <dt>事件數</dt>
                                <dd>{stats.eventsCount}</dd>
                            </div>
                            <div className="er-stat">
                                <dt>任務進度</dt>
                                <dd>{stats.completedTasksCount}/{stats.tasksCount}</dd>
                            </div>
                        </dl>
                    )}

                    {/* 快速動作：單手可及的大按鈕（≥44px） */}
                    <div className="er-workbench__actions" role="group" aria-label="應變快速動作">
                        {quickActions.map(({ icon: Icon, label, to }) => (
                            <button
                                key={label}
                                type="button"
                                className="er-action-btn"
                                onClick={() => navigate(to)}
                            >
                                <Icon size={22} aria-hidden="true" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="er-workbench__footer">
                        <Button
                            variant="danger"
                            onClick={() => setShowEndConfirm(true)}
                        >
                            <StopCircle size={18} aria-hidden="true" /> 結束任務
                        </Button>
                    </div>
                </section>
            ) : (
                <Card padding="lg" className="er-no-active">
                    <Siren size={32} aria-hidden="true" />
                    <p>目前沒有進行中的應變場次</p>
                    <p className="er-no-active__hint">
                        由右上「發起應變任務」建立場次，或於下方歷史清單啟動準備中的場次。
                    </p>
                </Card>
            )}

            {/* ===== 場次歷史（列表 archetype：卡片直列） ===== */}
            <section className="er-history" aria-label="任務歷史">
                <h3 className="er-history__title">任務歷史</h3>
                {sessions.length === 0 ? (
                    <Card padding="lg" className="er-no-active">
                        <p>尚無任何應變場次</p>
                    </Card>
                ) : (
                    <div className="er-history__grid">
                        {sessions.map(session => (
                            <Card key={session.id} padding="md" className="er-session-card">
                                <div className="er-session-card__header">
                                    <h4>{session.title}</h4>
                                    <Badge
                                        variant={STATUS_BADGE[session.status]}
                                        dot={session.status === 'active'}
                                    >
                                        {STATUS_TEXT[session.status]}
                                    </Badge>
                                </div>
                                <p className="er-session-card__info">
                                    指揮官：{session.commanderName || '未指定'}
                                </p>
                                <p className="er-session-card__date">
                                    建立：{new Date(session.createdAt).toLocaleString('zh-TW')}
                                </p>
                                <div className="er-session-card__actions">
                                    {session.status === 'preparing' && (
                                        <Button
                                            size="sm"
                                            onClick={() => startSession.mutate(session.id)}
                                            disabled={startSession.isPending}
                                        >
                                            啟動任務
                                        </Button>
                                    )}
                                    {session.status === 'completed' && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => navigate(`/emergency-response/aar/${session.id}`)}
                                        >
                                            復盤報告
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* ===== 建立場次 Modal（必填輸入 → Modal 合理，§4） ===== */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="發起應變任務"
                size="sm"
                footer={
                    <div className="er-modal-actions">
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            取消
                        </Button>
                        <Button
                            onClick={() => newSessionTitle.trim() && createSession.mutate(newSessionTitle.trim())}
                            disabled={!newSessionTitle.trim() || createSession.isPending}
                        >
                            {createSession.isPending ? '建立中…' : '建立'}
                        </Button>
                    </div>
                }
            >
                <label className="er-modal-label" htmlFor="er-session-title">任務名稱</label>
                <input
                    id="er-session-title"
                    type="text"
                    className="er-modal-input"
                    placeholder="例如：0801 水災應變"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSessionTitle.trim()) {
                            createSession.mutate(newSessionTitle.trim());
                        }
                    }}
                    autoFocus
                />
            </Modal>

            {/* ===== 結束任務：不可逆 → 二次確認（ConfirmModal 模式） ===== */}
            <Modal
                isOpen={showEndConfirm}
                onClose={() => setShowEndConfirm(false)}
                title="結束應變任務？"
                size="sm"
                footer={
                    <div className="er-modal-actions">
                        <Button variant="secondary" onClick={() => setShowEndConfirm(false)}>
                            取消
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => activeSession && endSession.mutate(activeSession.id)}
                            disabled={endSession.isPending}
                        >
                            {endSession.isPending ? '結束中…' : '確認結束'}
                        </Button>
                    </div>
                }
            >
                <p className="er-modal-text">
                    「{activeSession?.title}」將標記為已完成，此操作無法復原。
                    結束後可於任務歷史產生復盤報告。
                </p>
            </Modal>
        </div>
    );
}
