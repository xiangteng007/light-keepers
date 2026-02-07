import api from '../client';

// ===== LINE BOT 整合 =====

export interface LineBotStats {
    success: boolean;
    boundUserCount: number;
    botEnabled: boolean;
}

export interface NcdrBroadcastResult {
    success: boolean;
    message: string;
    sentCount: number;
}

// 取得 LINE BOT 統計
export const getLineBotStats = () =>
    api.get<{ success: boolean; data: LineBotStats }>('/line-bot/stats');

// 帳號綁定
export const bindLineAccount = (accountId: string, lineUserId: string) =>
    api.post<{ success: boolean; message: string }>('/line-bot/bind', { accountId, lineUserId });

// 解除綁定
export const unbindLineAccount = (accountId: string) =>
    api.post<{ success: boolean; message: string }>('/line-bot/unbind', { accountId });

// 推播 NCDR 災害示警給所有用戶
export const broadcastNcdrAlert = (data: {
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    affectedAreas?: string;
}) => api.post<NcdrBroadcastResult>('/line-bot/ncdr-broadcast', data);

// 推播給特定區域
export const broadcastNcdrAlertToRegion = (data: {
    region: string;
    title: string;
    description: string;
    severity: string;
}) => api.post<NcdrBroadcastResult>('/line-bot/ncdr-broadcast/region', data);

// 廣播訊息
export const broadcastLineMessage = (message: string) =>
    api.post<{ success: boolean; message: string }>('/line-bot/broadcast', { message });

// ===== 選單設定 Menu Config =====

export interface MenuConfigItem {
    id: string;
    label: string;
    order: number;
}

// 取得選單設定
export const getMenuConfig = () =>
    api.get<{ success: boolean; data: MenuConfigItem[] }>('/menu-config');

// 更新選單設定 (僅限擁有者)
export const updateMenuConfig = (items: MenuConfigItem[]) =>
    api.put<{ data: MenuConfigItem[]; message: string }>('/menu-config', { items });
