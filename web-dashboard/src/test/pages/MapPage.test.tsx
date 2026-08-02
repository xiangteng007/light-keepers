/**
 * R2b — MapPage（/geo/map）渲染測試（R5：地圖改掛 MapLibreTacticalMap）
 *
 * 重點驗證：
 * 1. 圖層控制收斂為分組面板（態勢／避難與資源／底圖）＋災時圖層組合。
 * 2. C1.2 保留：防空避難處所圖層開關存在，開啟後觸發 nearby 查詢。
 * 3. 側欄清單 → 點擊事件 → 行動卡（通報詳情 + 導航／建立任務派遣捷徑）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapPage from '../../pages/MapPage';

// ===== Mock MapLibre 戰術地圖（jsdom 無 WebGL；驗證薄 adapter 輸出的標記） =====
vi.mock('../../components/maps/MapLibreTacticalMap', () => ({
    default: ({ markers = [] }: { markers?: Array<{ id: string; label?: string }> }) => (
        <div data-testid="maplibre-map">
            {markers.map((m) => (
                <span key={m.id} data-testid="map-marker">{m.label}</span>
            ))}
        </div>
    ),
}));

// ===== Mock API =====
const mockEvents = [
    {
        id: 'e1',
        title: '中山路淹水',
        description: '約 30 公分',
        category: '水災',
        severity: 4,
        status: 'active',
        latitude: 25.03,
        longitude: 121.55,
        createdAt: new Date().toISOString(),
    },
];

const mockAirRaidShelters = [
    {
        id: 'ars-1',
        name: '中正地下停車場',
        city: '台北市',
        district: '中正區',
        address: '中正路 1 號',
        capacity: 500,
        basementLevels: 2,
        managingOrg: '中正區公所',
        latitude: 25.032,
        longitude: 121.51,
    },
];

const mockGetEvents = vi.fn();
const mockGetReportsForMap = vi.fn();
const mockGetNcdrAlertsForMap = vi.fn();
const mockGetNearbyAirRaidShelters = vi.fn();
const mockGetPublicResourcesForMap = vi.fn();
const mockGetNearbyAed = vi.fn();
const mockGetWarehousesForMap = vi.fn();
const mockGetHotspots = vi.fn();

vi.mock('../../api', () => ({
    getEvents: () => mockGetEvents(),
    getReportsForMap: () => mockGetReportsForMap(),
    getNcdrAlertsForMap: () => mockGetNcdrAlertsForMap(),
    getNearbyAirRaidShelters: (...args: unknown[]) => mockGetNearbyAirRaidShelters(...args),
    getPublicResourcesForMap: (...args: unknown[]) => mockGetPublicResourcesForMap(...args),
    getNearbyAed: (...args: unknown[]) => mockGetNearbyAed(...args),
    getWarehousesForMap: () => mockGetWarehousesForMap(),
    getHotspots: (...args: unknown[]) => mockGetHotspots(...args),
}));

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/geo/map']}>
                <MapPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetEvents.mockResolvedValue({ data: { data: mockEvents } });
    mockGetReportsForMap.mockResolvedValue({ data: [] });
    mockGetNcdrAlertsForMap.mockResolvedValue({ data: { data: [] } });
    mockGetNearbyAirRaidShelters.mockResolvedValue({ data: { data: mockAirRaidShelters } });
    mockGetPublicResourcesForMap.mockResolvedValue({ data: { shelters: [] } });
    mockGetNearbyAed.mockResolvedValue({ data: { data: [] } });
    mockGetWarehousesForMap.mockResolvedValue({ data: [] });
    mockGetHotspots.mockResolvedValue({ data: { data: { hotspots: [] } } });
});

describe('MapPage — 圖層分組面板', () => {
    it('渲染態勢／避難與資源／底圖分組與災時圖層組合按鈕', () => {
        renderPage();

        expect(screen.getByText('態勢')).toBeInTheDocument();
        expect(screen.getByText('避難與資源')).toBeInTheDocument();
        expect(screen.getByText('底圖')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /災時圖層組合/ })).toBeInTheDocument();

        // 態勢圖層
        expect(screen.getByRole('checkbox', { name: /災害回報/ })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /NCDR示警/ })).toBeChecked();
    });

    it('C1.2：防空避難處所圖層開關存在，開啟後觸發 nearby 查詢', async () => {
        renderPage();

        const toggle = screen.getByRole('checkbox', { name: /防空避難處所/ });
        expect(toggle).not.toBeChecked();
        expect(mockGetNearbyAirRaidShelters).not.toHaveBeenCalled();

        fireEvent.click(toggle);

        await waitFor(() => expect(mockGetNearbyAirRaidShelters).toHaveBeenCalled());
        // 5km 半徑（C1.2 既定行為）
        expect(mockGetNearbyAirRaidShelters.mock.calls[0][2]).toBe(5);
        // 標記出現（盾牌 marker 由 title 驗證）
        expect(await screen.findByText('中正地下停車場')).toBeInTheDocument();
    });

    it('災時圖層組合：一鍵開啟收容所 + 防空避難處所', async () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /災時圖層組合/ }));

        expect(screen.getByRole('checkbox', { name: /避難收容所/ })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /防空避難處所/ })).toBeChecked();
        await waitFor(() => expect(mockGetNearbyAirRaidShelters).toHaveBeenCalled());
    });
});

describe('MapPage — 側欄與行動卡', () => {
    it('清單顯示事件；點擊後出現行動卡（導航／建立任務派遣捷徑）', async () => {
        renderPage();

        // 等事件清單載入
        const item = await screen.findByRole('button', { name: /中山路淹水/ });
        fireEvent.click(item);

        // 行動卡出現：詳情 + 快速行動（InfoWindow 也有導航 → 至少一顆）
        expect(screen.getAllByRole('button', { name: /導航/ }).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /建立任務/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /關閉詳情/ })).toBeInTheDocument();
    });

    it('渲染災害回報／NCDR示警兩個清單分頁', () => {
        renderPage();
        expect(screen.getByRole('button', { name: /災害回報/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /NCDR示警/ })).toBeInTheDocument();
    });
});
