/**
 * R2a: DashboardPage（核心儀表板，/domains/core/dashboard）渲染測試
 *
 * 驗證依角色分層（DESIGN_LANGUAGE §5）：
 * - L0–L1 志工 → 「我的工作台」極簡版（捷徑＋我的任務）
 * - L2+ 幹部  → 「營運總覽」（KPI＋任務/人力/整備待辦）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../../pages/domains/core/DashboardPage';

const authState = vi.hoisted(() => ({ roleLevel: 1 }));
const kanbanState = vi.hoisted(() => ({
    data: {
        pending: [] as Array<Record<string, unknown>>,
        inProgress: [] as Array<Record<string, unknown>>,
        completed: [] as Array<Record<string, unknown>>,
    },
}));

vi.mock('../../context/AuthContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../context/AuthContext')>();
    return {
        ...actual,
        useAuth: () => ({
            user: {
                id: 'u1',
                email: 'volunteer@example.com',
                displayName: '阿明',
                roleLevel: authState.roleLevel,
                roleDisplayName: '志工',
            },
            isAuthenticated: true,
            isAnonymous: false,
            isLoading: false,
        }),
    } as unknown as typeof actual;
});

vi.mock('../../api/services', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api/services')>();
    const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });
    return {
        ...actual,
        getTaskKanban: vi.fn(() => ok(kanbanState.data)),
        getTaskStats: vi.fn(() => ok({ pending: 3, inProgress: 5, completed: 12, overdue: 1 })),
        getReportStats: vi.fn(() => ok({ total: 40, pending: 4, confirmed: 30, rejected: 6, byType: {} })),
        getVolunteerStats: vi.fn(() => ok({ total: 50, available: 21, busy: 9, offline: 20, totalServiceHours: 300 })),
        getResourceStats: vi.fn(() => ok({ total: 80, byCategory: {}, lowStock: 2, expiringSoon: 0 })),
        getPendingVolunteerCount: vi.fn(() => ok({ count: 2 })),
        getTasks: vi.fn(() => ok([])),
    } as unknown as typeof actual;
});

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchInterval: false } },
    });
    return render(
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <DashboardPage />
            </QueryClientProvider>
        </BrowserRouter>,
    );
}

describe('DashboardPage（核心儀表板，依角色分層）', () => {
    beforeEach(() => {
        authState.roleLevel = 1;
        kanbanState.data = { pending: [], inProgress: [], completed: [] };
    });

    it('L1 志工：renders the minimal 我的工作台 with quick shortcuts, not the ops overview', () => {
        renderPage();

        expect(screen.getByRole('heading', { level: 1, name: '我的工作台' })).toBeInTheDocument();

        // 快速捷徑（1 次點擊到關鍵動作）
        expect(screen.getByText('快速通報')).toBeInTheDocument();
        expect(screen.getByText('任務看板')).toBeInTheDocument();
        expect(screen.getByText('排班日曆')).toBeInTheDocument();
        expect(screen.getByText('統一地圖')).toBeInTheDocument();

        // 不顯示幹部營運內容
        expect(screen.queryByText('營運總覽')).not.toBeInTheDocument();
        expect(screen.queryByText('整備待辦')).not.toBeInTheDocument();
    });

    it('L1 志工：shows an explicit EmptyState when no task is assigned to me', async () => {
        kanbanState.data = {
            pending: [{ id: 't-other', title: '別人的任務', priority: 1, status: 'pending', assignedTo: '別人', createdAt: new Date().toISOString() }],
            inProgress: [],
            completed: [],
        };
        renderPage();

        expect(await screen.findByText('目前沒有指派給你的任務')).toBeInTheDocument();
        expect(screen.queryByText('別人的任務')).not.toBeInTheDocument();
    });

    it('L1 志工：lists tasks assigned to me from the kanban API', async () => {
        kanbanState.data = {
            pending: [],
            inProgress: [{ id: 't-1', title: '修復抽水機', priority: 1, status: 'in_progress', assignedTo: '阿明', createdAt: new Date().toISOString() }],
            completed: [],
        };
        renderPage();

        expect(await screen.findByText('修復抽水機')).toBeInTheDocument();
        expect(screen.getByText('進行中')).toBeInTheDocument();
    });

    it('L2+ 幹部：renders the 營運總覽 with operational KPIs and readiness todos', async () => {
        authState.roleLevel = 3;
        renderPage();

        expect(screen.getByRole('heading', { level: 1, name: '營運總覽' })).toBeInTheDocument();
        expect(screen.queryByText('我的工作台')).not.toBeInTheDocument();

        // KPI 值來自 API（KPI 與面板統計可能重複出現同一數字）
        expect((await screen.findAllByText('5')).length).toBeGreaterThan(0);  // 進行中任務
        expect((await screen.findAllByText('21')).length).toBeGreaterThan(0); // 可動員志工
        expect(screen.getByText('整備待辦')).toBeInTheDocument();
        // 待審核志工 2 件（getPendingVolunteerCount）
        expect(await screen.findByText('待審核志工')).toBeInTheDocument();
    });
});
