import api from '../client';

// ===== NCDR 災害示警 =====

export interface NcdrAlert {
    id: string;
    alertId: string;
    alertTypeId: number;
    alertTypeName: string;
    title: string;
    description?: string;
    severity: 'critical' | 'warning' | 'info';
    sourceUnit?: string;
    publishedAt: string;
    expiresAt?: string;
    sourceLink?: string;
    latitude?: number;
    longitude?: number;
    affectedAreas?: string;
    isActive: boolean;
}

export interface AlertTypeDefinition {
    id: number;
    name: string;
    sourceUnit: string;
    category: 'central' | 'enterprise' | 'local';
    priority: 'core' | 'extended';
}

// 獲取示警類別定義
export const getNcdrAlertTypes = () =>
    api.get<{ types: AlertTypeDefinition[]; coreTypes: number[] }>('/ncdr-alerts/types');

// 獲取警報列表
export const getNcdrAlerts = (params?: { types?: string; activeOnly?: boolean; limit?: number }) =>
    api.get<{ success: boolean; data: NcdrAlert[]; total: number }>('/ncdr-alerts', { params });

// 獲取地圖用警報 (有座標)
export const getNcdrAlertsForMap = (types?: number[]) =>
    api.get<{ success: boolean; data: NcdrAlert[]; total: number }>('/ncdr-alerts/map', {
        params: types ? { types: types.join(',') } : undefined,
    });

// 獲取統計
export const getNcdrAlertStats = () =>
    api.get<{
        success: boolean; data: {
            total: number;
            active: number;
            byType: { typeId: number; typeName: string; count: number }[];
            lastSyncTime: string | null;
        }
    }>('/ncdr-alerts/stats');

// 手動觸發同步 (核心類別)
export const syncNcdrAlerts = () =>
    api.post<{ message: string; synced: number; errors: number }>('/ncdr-alerts/sync');

// 手動觸發同步指定類別
export const syncNcdrAlertTypes = (typeIds: number[]) =>
    api.post<{ message: string; synced: number; errors: number; syncedTypes: number[] }>(
        '/ncdr-alerts/sync-types',
        { typeIds }
    );

// ===== 公共資源（避難所/AED）=====

export interface Shelter {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    type: string;
    status: 'open' | 'closed' | 'standby';
    phone?: string;
}

export interface AedLocation {
    id: string;
    name: string;
    address: string;
    city: string;
    district: string;
    latitude: number;
    longitude: number;
    placeName: string;
    floor?: string;
    openHours?: string;
    phone?: string;
}

// 取得所有避難收容所
export const getShelters = () =>
    api.get<{ data: Shelter[]; total: number }>('/public-resources/shelters');

// 查找附近避難收容所
export const getNearbyShelters = (lat: number, lng: number, radiusKm?: number) =>
    api.get<{ data: Shelter[]; total: number }>('/public-resources/shelters/nearby', {
        params: { lat, lng, radius: radiusKm }
    });

// 取得所有 AED 位置
export const getAedLocations = () =>
    api.get<{ data: AedLocation[]; total: number }>('/public-resources/aed');

// 查找附近 AED
export const getNearbyAed = (lat: number, lng: number, radiusKm?: number) =>
    api.get<{ data: AedLocation[]; total: number }>('/public-resources/aed/nearby', {
        params: { lat, lng, radius: radiusKm }
    });

// 取得地圖用公共資源（合併）
export const getPublicResourcesForMap = (types?: ('shelters' | 'aed')[]) =>
    api.get<{ shelters?: Shelter[]; aed?: AedLocation[] }>('/public-resources/map', {
        params: types ? { types: types.join(',') } : undefined
    });
