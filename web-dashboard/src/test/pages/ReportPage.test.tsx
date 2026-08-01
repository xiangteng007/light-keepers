/**
 * R2b — ReportPage（/intake 通報）渲染測試
 *
 * 重點驗證：
 * 1. C1.1（CD-1）功能保留：災型分組（天災／民防）、12 災型全數渲染、
 *    MCI 旗標勾選 + 概估人數。
 * 2. 30 秒三步流：災型 → 現場 → 送出；未選災型不得前進。
 * 3. 離線可用性：離線時顯示明示徽章；送出走 offlineService intake outbox，
 *    成功畫面顯示「已暫存」。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportPage from '../../pages/ReportPage';
import {
    DISASTER_TYPE_OPTIONS,
    DISASTER_TYPE_GROUPS,
} from '../../constants/disasterTypes';

// ===== Mocks =====

const mockCreateReport = vi.fn();
vi.mock('../../api/services', () => ({
    createReport: (...args: unknown[]) => mockCreateReport(...args),
}));

const mockQueueIntakeReport = vi.fn();
vi.mock('../../services/offline/offline.service', () => ({
    offlineService: {
        queueIntakeReport: (...args: unknown[]) => mockQueueIntakeReport(...args),
    },
}));

function setOnline(online: boolean) {
    Object.defineProperty(navigator, 'onLine', {
        value: online,
        configurable: true,
        writable: true,
    });
}

function mockGeolocation(lat = 25.033, lng = 121.565) {
    Object.defineProperty(navigator, 'geolocation', {
        value: {
            getCurrentPosition: (success: (pos: unknown) => void) =>
                success({ coords: { latitude: lat, longitude: lng } }),
        },
        configurable: true,
        writable: true,
    });
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/intake']}>
            <ReportPage />
        </MemoryRouter>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    setOnline(true);
    mockGeolocation();
    mockCreateReport.mockResolvedValue({ data: { id: 'r1' } });
    mockQueueIntakeReport.mockResolvedValue(undefined);
});

describe('ReportPage — 災型步驟（C1.1 保留）', () => {
    it('渲染天災／民防兩個分組標題', () => {
        renderPage();
        for (const group of DISASTER_TYPE_GROUPS) {
            expect(screen.getByText(group.title)).toBeInTheDocument();
        }
    });

    it('渲染全部 12 個災型（含民防四類）', () => {
        renderPage();
        for (const option of DISASTER_TYPE_OPTIONS) {
            expect(screen.getByRole('button', { name: new RegExp(option.label) })).toBeInTheDocument();
        }
        // 民防類別逐一點名（C1.1 不得掉）
        expect(screen.getByRole('button', { name: /空襲／砲擊/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /爆炸／爆裂物/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /恐怖攻擊/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /化生放核/ })).toBeInTheDocument();
    });

    it('MCI 旗標：勾選後出現概估人數輸入框', () => {
        renderPage();

        const toggle = screen.getByRole('checkbox', { name: /大量傷患/ });
        expect(screen.queryByPlaceholderText(/概估傷患人數/)).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(screen.getByPlaceholderText(/概估傷患人數/)).toBeInTheDocument();
    });

    it('未選災型時按「下一步」顯示錯誤且停在原步驟', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

        expect(screen.getByRole('alert')).toHaveTextContent('請選擇災害類型');
        expect(screen.getByText('發生了什麼？')).toBeInTheDocument();
    });
});

describe('ReportPage — 三步流與送出', () => {
    async function fillToConfirm() {
        // 第 1 步：選民防災型 + MCI
        fireEvent.click(screen.getByRole('button', { name: /空襲／砲擊/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: /大量傷患/ }));
        fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

        // 第 2 步：現場（自動定位由 mockGeolocation 立即回覆）
        await screen.findByText('現場狀況');
        expect(screen.getByText('已取得位置')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

        // 第 3 步：確認
        await screen.findByText('確認送出');
    }

    it('災型 → 現場 → 送出（線上）：呼叫 createReport 並帶 C1.1 欄位', async () => {
        renderPage();
        await fillToConfirm();

        // C1.1 確認頁顯示 MCI 與災型
        expect(screen.getAllByText(/空襲／砲擊/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/大量傷患/).length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: /送出通報/ }));

        await waitFor(() => expect(mockCreateReport).toHaveBeenCalledTimes(1));
        expect(mockCreateReport).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'air_raid',
                isMassCasualty: true,
                latitude: 25.033,
                longitude: 121.565,
                // 標題留空 → 以災型 SSOT 自動補
                title: '空襲／砲擊災情通報',
            })
        );
        expect(await screen.findByText('通報已送出')).toBeInTheDocument();
        expect(mockQueueIntakeReport).not.toHaveBeenCalled();
    });

    it('離線送出：顯示離線徽章、走 outbox、成功畫面顯示「已暫存」', async () => {
        setOnline(false);
        renderPage();

        // 離線可用性明示
        expect(screen.getByText(/離線模式/)).toBeInTheDocument();

        await fillToConfirm();
        expect(screen.getByText(/目前離線/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /離線暫存送出/ }));

        await waitFor(() => expect(mockQueueIntakeReport).toHaveBeenCalledTimes(1));
        expect(mockCreateReport).not.toHaveBeenCalled();
        expect(await screen.findByText('通報已暫存於此裝置')).toBeInTheDocument();
        expect(screen.getByText(/恢復連線後會自動送出/)).toBeInTheDocument();
    });
});
