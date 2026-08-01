/**
 * R2a: CommandCenterPage（戰情總覽 COP 態勢牆）渲染測試
 *
 * 驗證重設計後的資訊架構：
 * - KPI 列（通報總數/未處理通報/派遣中任務/大量傷患事件）吃真實 API 資料
 * - 活動警報/最新通報面板渲染資料列
 * - 缺資料區塊以 EmptyState 明示（災情熱點無資料）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommandCenterPage from '../../pages/CommandCenterPage';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeProvider';

vi.mock('../../api/services', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api/services')>();
    const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });
    const now = new Date().toISOString();

    return {
        ...actual,
        getReportStats: vi.fn(() =>
            ok({ total: 42, pending: 7, confirmed: 30, rejected: 5, byType: {} })),
        getTaskStats: vi.fn(() =>
            ok({ pending: 4, inProgress: 9, completed: 20, overdue: 2 })),
        getReports: vi.fn((params?: { isMassCasualty?: boolean }) =>
            params?.isMassCasualty
                ? ok([
                    {
                        id: 'r-mci', type: 'flood', severity: 'critical', status: 'confirmed',
                        title: '橋頭大量傷患事件', description: '', latitude: 0, longitude: 0,
                        isMassCasualty: true, casualtyEstimate: 12, createdAt: now, updatedAt: now,
                    },
                ])
                : ok([
                    {
                        id: 'r-1', type: 'flood', severity: 'high', status: 'pending',
                        title: '三民區積水通報', description: '', latitude: 0, longitude: 0,
                        createdAt: now, updatedAt: now,
                    },
                ])),
        getNcdrAlerts: vi.fn(() =>
            ok([
                {
                    id: 'a-1', alertId: 'A1', alertTypeId: 1, alertTypeName: '大雨特報',
                    title: '高雄市大雨特報', severity: 'warning', publishedAt: now,
                    affectedAreas: '高雄市', isActive: true,
                },
            ])),
        getReportTrend: vi.fn(() =>
            ok({ labels: ['一', '二', '三'], datasets: [{ label: 'all', data: [1, 4, 2] }] })),
        getHotspots: vi.fn(() =>
            ok({ hotspots: [], totalReports: 0, generatedAt: now })),
        getResourceStats: vi.fn(() =>
            ok({ total: 12, byCategory: {}, lowStock: 3, expiringSoon: 1 })),
        getLowStockResources: vi.fn(() =>
            ok([
                {
                    id: 'res-1', name: '瓶裝水', category: 'water', quantity: 8, unit: '箱',
                    status: 'low', createdAt: now, updatedAt: now,
                },
            ])),
        getVolunteerStats: vi.fn(() =>
            ok({ total: 50, available: 20, busy: 10, offline: 20, totalServiceHours: 123 })),
    } as unknown as typeof actual;
});

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchInterval: false } },
    });
    return render(
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <AuthProvider>
                        <CommandCenterPage />
                    </AuthProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </BrowserRouter>,
    );
}

describe('CommandCenterPage（戰情總覽）', () => {
    it('renders the COP header and the four situational KPIs with API data', async () => {
        renderPage();

        expect(screen.getByRole('heading', { level: 1, name: '戰情總覽' })).toBeInTheDocument();

        // KPI 標籤
        expect(screen.getByText('通報總數')).toBeInTheDocument();
        expect(screen.getByText('未處理通報')).toBeInTheDocument();
        expect(screen.getByText('派遣中任務')).toBeInTheDocument();
        expect(screen.getByText('大量傷患事件')).toBeInTheDocument();

        // KPI 數值來自 API（非假資料）
        expect(await screen.findByText('42')).toBeInTheDocument();  // 通報總數
        expect(await screen.findByText('7')).toBeInTheDocument();   // 未處理
        expect(await screen.findByText('9')).toBeInTheDocument();   // 派遣中
        expect(await screen.findByText('預估傷患 12 人')).toBeInTheDocument(); // MCI
    });

    it('renders active alerts and the latest report feed from the API', async () => {
        renderPage();

        expect(await screen.findByText('高雄市大雨特報')).toBeInTheDocument();
        expect(await screen.findByText('三民區積水通報')).toBeInTheDocument();
        // 資源水位面板的低庫存清單
        expect(await screen.findByText('瓶裝水')).toBeInTheDocument();
    });

    it('shows an explicit EmptyState (not fake data) when a data source is empty', async () => {
        renderPage();

        // 熱點 API 回空陣列 → EmptyState 明示，而非塞假熱點
        expect(await screen.findByText('近 7 日無災情熱點')).toBeInTheDocument();
    });
});
