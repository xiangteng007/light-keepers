import api from '../client';

// ===== 報表匯出 Reports Export =====

export interface VolunteerHoursReport {
    volunteerId: string;
    volunteerName: string;
    totalHours: number;
    taskCount: number;
}

export interface DisasterReport {
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    responseTimeAvg: number;
}

// 取得志工時數報表
export const getVolunteerHoursReport = (start?: string, end?: string) =>
    api.get<{ success: boolean; data: VolunteerHoursReport[] }>('/reports-export/volunteer-hours', {
        params: { start, end },
    });

// 下載志工時數 CSV
export const downloadVolunteerHoursCSV = (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/volunteer-hours/csv?${params.toString()}`, '_blank');
};

// 取得災情統計報表
export const getDisasterReport = (start?: string, end?: string) =>
    api.get<{ success: boolean; data: DisasterReport }>('/reports-export/disaster-stats', {
        params: { start, end },
    });

// 下載災情統計 JSON
export const downloadDisasterJSON = (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/disaster-stats/json?${params.toString()}`, '_blank');
};

// ===== 庫存報表 =====

export interface InventoryReport {
    title: string;
    generatedAt: string;
    data: {
        total: number;
        totalLowStock: number;
        totalDepleted: number;
        totalExpiringSoon: number;
        byCategory: Record<string, { count: number; totalQuantity: number; lowStock: number; depleted: number }>;
        rows: Array<{
            id: string;
            name: string;
            category: string;
            quantity: number;
            unit: string;
            status: string;
            location: string;
            expiresAt: string;
        }>;
    };
}

// 取得庫存報表
export const getInventoryReport = () =>
    api.get<{ success: boolean; data: InventoryReport }>('/reports-export/inventory');

// 下載庫存 CSV
export const downloadInventoryCSV = () => {
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/inventory/csv`, '_blank');
};

// 下載庫存 JSON
export const downloadInventoryJSON = () => {
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/inventory/json`, '_blank');
};

// 取得庫存異動報表
export const getInventoryTransactionReport = (start?: string, end?: string) =>
    api.get<{ success: boolean; data: InventoryReport }>('/reports-export/inventory-transactions', {
        params: { start, end },
    });

// 下載庫存異動 CSV
export const downloadInventoryTransactionCSV = (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/inventory-transactions/csv?${params.toString()}`, '_blank');
};
