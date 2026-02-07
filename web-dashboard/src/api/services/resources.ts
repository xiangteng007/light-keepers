import api from '../client';

// ===== 物資管理 Resources =====

export type ResourceCategory = 'food' | 'water' | 'medical' | 'shelter' | 'clothing' | 'equipment' | 'other';
export type ResourceStatus = 'available' | 'low' | 'depleted';
export type TransactionType = 'in' | 'out' | 'transfer' | 'donation' | 'adjustment';

export interface Resource {
    id: string;
    name: string;
    category: ResourceCategory;
    description?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    status: ResourceStatus;
    location?: string;
    photoUrl?: string;
    barcode?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ResourceTransaction {
    id: string;
    resourceId: string;
    type: TransactionType;
    quantity: number;
    beforeQuantity: number;
    afterQuantity: number;
    operatorName: string;
    operatorId?: string;
    fromLocation?: string;
    toLocation?: string;
    notes?: string;
    referenceNo?: string;
    createdAt: string;
}

export interface DonationSource {
    id: string;
    name: string;
    type: 'individual' | 'corporate' | 'government' | 'ngo' | 'other';
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    notes?: string;
    needsReceipt?: boolean;
    totalDonations: number;
    totalValue: number;
    createdAt: string;
}

export interface CreateResourceDto {
    name: string;
    category: ResourceCategory;
    description?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    location?: string;
    expiresAt?: string;
    photoUrl?: string;
    barcode?: string;
}

// 取得物資列表
export const getResources = (params?: { category?: ResourceCategory }) =>
    api.get<{ success: boolean; data: Resource[]; count: number }>('/resources', { params });

// 取得單一物資
export const getResource = (id: string) => api.get<Resource>(`/resources/${id}`);

// 建立物資
export const createResource = (data: CreateResourceDto) => api.post<Resource>('/resources', data);

// 更新物資
export const updateResource = (id: string, data: Partial<CreateResourceDto>) =>
    api.patch<Resource>(`/resources/${id}`, data);

// 刪除物資
export const deleteResource = (id: string) => api.delete(`/resources/${id}`);

// 入庫
export const addStock = (id: string, quantity: number, operatorName: string, notes?: string) =>
    api.post<Resource>(`/resources/${id}/stock/add`, { quantity, operatorName, notes });

// 出庫
export const deductStock = (id: string, quantity: number, operatorName: string, notes?: string) =>
    api.post<Resource>(`/resources/${id}/stock/deduct`, { quantity, operatorName, notes });

// 取得異動紀錄
export const getResourceTransactions = (id: string) =>
    api.get<ResourceTransaction[]>(`/resources/${id}/transactions`);

// 取得所有異動紀錄
export const getAllTransactions = () => api.get<ResourceTransaction[]>('/resources/transactions/all');

// 條碼查詢
export const getResourceByBarcode = (barcode: string) =>
    api.get<Resource>(`/resources/barcode/${barcode}`);

// 物資轉移
export const transferResource = (id: string, data: {
    quantity: number;
    fromLocation: string;
    toLocation: string;
    operatorName: string;
}) => api.post<ResourceTransaction>(`/resources/${id}/transfer`, data);

// 取得捐贈來源
export const getDonationSources = () => api.get<DonationSource[]>('/resources/donations/sources');

// 建立捐贈來源
export const createDonationSource = (data: Partial<DonationSource>) =>
    api.post<DonationSource>('/resources/donations/sources', data);

// 記錄捐贈
export const recordDonation = (resourceId: string, data: {
    quantity: number;
    donationSourceId: string;
    operatorName: string;
    estimatedValue?: number;
}) => api.post<ResourceTransaction>(`/resources/${resourceId}/donate`, data);

// 取得物資統計
export const getResourceStats = () => api.get<{
    success: boolean; data: {
        total: number;
        byCategory: Record<string, number>;
        lowStock: number;
        expiringSoon: number;
    }
}>('/resources/stats');

// 取得低庫存物資
export const getLowStockResources = () =>
    api.get<{ success: boolean; data: Resource[]; count: number }>('/resources/low-stock');

// 取得即期品
export const getExpiringResources = (days?: number) =>
    api.get<{ success: boolean; data: Resource[]; count: number }>('/resources/expiring', { params: { days } });
