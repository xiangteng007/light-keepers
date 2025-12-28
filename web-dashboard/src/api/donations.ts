import api from './client';

// ===== 捐款系統 Donations =====

export type DonorType = 'individual' | 'corporate';
export type PaymentMethod = 'credit_card' | 'atm' | 'cvs' | 'line_pay' | 'bank_transfer' | 'cash' | 'other';
export type DonationStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface Donor {
    id: string;
    type: DonorType;
    name: string;
    email?: string;
    phone?: string;
    taxId?: string;
    address?: string;
    isAnonymous: boolean;
    wantsReceipt: boolean;
    totalDonationCount: number;
    totalDonationAmount: number;
    createdAt: string;
}

export interface Donation {
    id: string;
    donorId: string;
    donor?: Donor;
    amount: number;
    paymentMethod: PaymentMethod;
    donationType: 'one_time' | 'recurring';
    status: DonationStatus;
    projectName?: string;
    purpose?: string;
    merchantTradeNo: string;
    transactionId?: string;
    paidAt?: string;
    receiptId?: string;
    receipt?: Receipt;
    notes?: string;
    createdAt: string;
}

export interface Receipt {
    id: string;
    donationId: string;
    receiptNo: string;
    status: 'issued' | 'cancelled' | 'reissued';
    donorName: string;
    donorIdentity?: string;
    amount: number;
    purpose?: string;
    issuedAt: string;
    cancelledAt?: string;
    pdfUrl?: string;
    year: number;
}

export interface CreateDonorDto {
    type: DonorType;
    name: string;
    email?: string;
    phone?: string;
    identityNumber?: string;
    taxId?: string;
    address?: string;
    isAnonymous?: boolean;
    wantsReceipt?: boolean;
}

export interface CreateDonationDto {
    donorId?: string;
    donor?: CreateDonorDto;
    amount: number;
    paymentMethod: PaymentMethod;
    projectName?: string;
    purpose?: string;
    notes?: string;
}

export interface DonationStats {
    totalDonations: number;
    totalAmount: number;
    donorCount: number;
    todayAmount: number;
    monthAmount: number;
    byPaymentMethod: Record<string, number>;
}

// 取得捐款統計
export const getDonationStats = () =>
    api.get<{ success: boolean; data: DonationStats }>('/donations/stats');

// 取得捐款列表
export const getDonations = (params?: {
    status?: DonationStatus;
    donorId?: string;
    limit?: number;
    offset?: number;
}) => api.get<{ success: boolean; data: Donation[]; total: number }>('/donations', { params });

// 取得單筆捐款
export const getDonation = (id: string) =>
    api.get<{ success: boolean; data: Donation }>(`/donations/${id}`);

// 建立捐款
export const createDonation = (data: CreateDonationDto) =>
    api.post<{ success: boolean; message: string; data: Donation }>('/donations', data);

// 確認付款 (測試用)
export const confirmPayment = (merchantTradeNo: string, transactionId: string) =>
    api.post<{ success: boolean; message: string; data: Donation }>('/donations/confirm-payment', {
        merchantTradeNo,
        transactionId,
    });

// 取得捐款人列表
export const getDonors = (params?: { limit?: number; offset?: number }) =>
    api.get<{ success: boolean; data: Donor[]; total: number }>('/donations/donors', { params });

// 建立捐款人
export const createDonor = (data: CreateDonorDto) =>
    api.post<{ success: boolean; message: string; data: Donor }>('/donations/donors', data);

// 開立收據
export const issueReceipt = (donationId: string) =>
    api.post<{ success: boolean; message: string; data: Receipt }>(`/donations/${donationId}/receipt`);

// 作廢收據
export const cancelReceipt = (receiptId: string, reason: string) =>
    api.patch<{ success: boolean; message: string; data: Receipt }>(`/donations/receipts/${receiptId}/cancel`, { reason });

// 取得年度收據
export const getReceiptsByYear = (year: number) =>
    api.get<{ success: boolean; data: Receipt[]; count: number }>(`/donations/receipts/year/${year}`);

// 更新捐款人
export const updateDonor = (id: string, data: { name?: string; email?: string; phone?: string; address?: string }) =>
    api.patch<{ success: boolean; message: string; data: Donor }>(`/donations/donors/${id}`, data);

// 刪除捐款人
export const deleteDonor = (id: string) =>
    api.patch<{ success: boolean; message: string }>(`/donations/donors/${id}/delete`);

// 取得 CSV 匯出 URL
export const getExportCsvUrl = (year?: number) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://light-keepers-api-890013751803.asia-east1.run.app';
    const targetYear = year || new Date().getFullYear();
    return `${baseUrl}/donations/export/csv?year=${targetYear}`;
};
