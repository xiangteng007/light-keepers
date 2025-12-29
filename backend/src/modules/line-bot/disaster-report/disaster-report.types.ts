/**
 * 災情回報 LINE Bot - 型別定義
 * BOT-REPORT-001
 */

/**
 * 回報會話狀態
 */
export enum ReportSessionState {
    IDLE = 'IDLE',                    // 無進行中的回報
    WAIT_TEXT = 'WAIT_TEXT',          // 等待災情描述文字
    WAIT_IMAGE = 'WAIT_IMAGE',        // 等待照片（可選）
    WAIT_LOCATION = 'WAIT_LOCATION',  // 等待定位
    CONFIRM = 'CONFIRM',              // 確認送出
    SUBMITTED = 'SUBMITTED',          // 已送出
}

/**
 * 位置資料
 */
export interface LocationData {
    lat: number;
    lng: number;
    address?: string;
}

/**
 * 回報會話資料
 */
export interface ReportSessionData {
    text?: string;           // 災情描述
    imageUrls?: string[];    // 已上傳圖片 URL
    location?: LocationData;
}

/**
 * 回報會話（存儲在 Firestore）
 */
export interface ReportSession {
    lineUserId: string;
    displayName?: string;
    state: ReportSessionState;
    data: ReportSessionData;
    startedAt: Date;
    expiresAt: Date;
    updatedAt: Date;
}

/**
 * LINE Webhook 事件類型
 */
export type LineEventType = 'text' | 'image' | 'location' | 'other';

/**
 * 災情回報建立請求
 */
export interface CreateDisasterReportDto {
    text: string;
    imageUrls?: string[];
    location: LocationData;
    reporterLineUserId: string;
    reporterDisplayName?: string;
}

/**
 * 災情回報建立回應
 */
export interface CreateDisasterReportResponse {
    success: boolean;
    reportId?: string;
    message: string;
}
