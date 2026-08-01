/**
 * R2b — EmergencyResponsePage 渲染測試
 *
 * 重點驗證：
 * 1. 分工明確化：頁面說明「做應變」，並提供往戰情儀表板（看態勢）的連結。
 * 2. 進行中場次 → 應變工作檯：六個快速動作 + 結束任務（二次確認 Modal）。
 * 3. 無進行中場次 → 引導空狀態；歷史清單渲染狀態徽章與啟動按鈕。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmergencyResponsePage from '../../pages/EmergencyResponsePage';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../api/client', () => ({
    default: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
    },
}));

const activeSession = {
    id: 'ms-1',
    title: '0801 水災應變',
    status: 'active',
    commanderName: '王小明',
    createdAt: '2026-08-01T00:00:00Z',
};

const preparingSession = {
    id: 'ms-2',
    title: '演練場次',
    status: 'preparing',
    commanderName: '李幹部',
    createdAt: '2026-07-30T00:00:00Z',
};

const stats = {
    sessionId: 'ms-1',
    status: 'active',
    eventsCount: 3,
    tasksCount: 10,
    completedTasksCount: 4,
    duration: 5400,
};

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/emergency/sos']}>
                <EmergencyResponsePage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
        if (url === '/mission-sessions') {
            return Promise.resolve({ data: [activeSession, preparingSession] });
        }
        if (url === `/mission-sessions/${activeSession.id}/stats`) {
            return Promise.resolve({ data: stats });
        }
        return Promise.resolve({ data: null });
    });
    mockPost.mockResolvedValue({ data: {} });
});

describe('EmergencyResponsePage — 分工與工作檯', () => {
    it('說明「做應變」分工並連結戰情儀表板', async () => {
        renderPage();
        await screen.findByRole('heading', { name: '0801 水災應變', level: 3 });

        expect(screen.getByText(/發起與執行應變場次/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /戰情儀表板/ })).toBeInTheDocument();
    });

    it('進行中場次顯示工作檯：六個快速動作 + 統計', async () => {
        renderPage();
        await screen.findByRole('heading', { name: '0801 水災應變', level: 3 });

        for (const label of ['COP 地圖', '指揮中心', '作戰計畫', '情勢報告', '查看事件', '任務管理']) {
            expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
        }

        // 統計（等 stats query）
        expect(await screen.findByText('1h 30m')).toBeInTheDocument();
        expect(screen.getByText('4/10')).toBeInTheDocument();
    });

    it('結束任務需二次確認（ConfirmModal 模式），確認後呼叫 end API', async () => {
        renderPage();
        await screen.findByRole('heading', { name: '0801 水災應變', level: 3 });

        fireEvent.click(screen.getByRole('button', { name: /結束任務/ }));

        // Modal 出現
        expect(await screen.findByText('結束應變任務？')).toBeInTheDocument();
        expect(mockPost).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /確認結束/ }));

        await waitFor(() =>
            expect(mockPost).toHaveBeenCalledWith('/mission-sessions/ms-1/end', {})
        );
    });

    it('歷史清單：準備中場次可啟動', async () => {
        renderPage();
        await screen.findByText('演練場次');

        expect(screen.getByText('準備中')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /啟動任務/ }));
        await waitFor(() =>
            expect(mockPost).toHaveBeenCalledWith('/mission-sessions/ms-2/start', {})
        );
    });

    it('無進行中場次時顯示引導空狀態', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/mission-sessions') {
                return Promise.resolve({ data: [preparingSession] });
            }
            return Promise.resolve({ data: null });
        });

        renderPage();

        expect(await screen.findByText('目前沒有進行中的應變場次')).toBeInTheDocument();
        expect(screen.getByText(/發起應變任務」建立場次/)).toBeInTheDocument();
    });
});
