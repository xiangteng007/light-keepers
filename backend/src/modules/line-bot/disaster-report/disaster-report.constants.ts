/**
 * 災情回報 LINE Bot - 常數與訊息模板
 * BOT-REPORT-001
 */

/**
 * Session 過期時間（毫秒）
 */
export const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 分鐘

/**
 * 觸發災情回報的關鍵字
 */
export const REPORT_TRIGGER_KEYWORDS = ['回報', '災情', '通報', '報案'];

/**
 * 取消指令關鍵字
 */
export const CANCEL_KEYWORDS = ['取消', '結束', '放棄', 'cancel'];

/**
 * 跳過圖片上傳關鍵字
 */
export const SKIP_IMAGE_KEYWORDS = ['跳過', '略過', 'skip', '沒有照片'];

/**
 * 確認送出關鍵字
 */
export const CONFIRM_KEYWORDS = ['確認', '送出', '確定', 'yes', 'ok'];

/**
 * 對話訊息模板
 */
export const MESSAGES = {
    // 歡迎訊息
    WELCOME: '🚨 開始災情回報\n\n' +
        '請描述您看到的災情狀況：\n' +
        '（例：「路樹倒塌阻擋道路」）\n\n' +
        '💡 輸入「取消」可隨時終止回報',

    // 等待照片
    WAIT_IMAGE: '📝 已記錄災情描述！\n\n' +
        '請上傳現場照片：\n' +
        '（點擊「+」→「相簿」或「相機」）\n\n' +
        '💡 輸入「跳過」可略過照片上傳',

    // 接收到照片
    IMAGE_RECEIVED: '📷 已收到照片！\n\n' +
        '可繼續上傳更多照片，或輸入「完成」進入下一步',

    // 等待定位
    WAIT_LOCATION: '📍 接下來請分享位置：\n\n' +
        '點擊「+」→「位置資訊」\n' +
        '→ 選擇災情發生地點',

    // 確認訊息模板
    CONFIRM_TEMPLATE: (data: { text: string; imageCount: number; address?: string }) =>
        '📋 請確認回報內容：\n\n' +
        `📝 描述：${data.text.substring(0, 50)}${data.text.length > 50 ? '...' : ''}\n` +
        `📷 照片：${data.imageCount} 張\n` +
        `📍 位置：${data.address || '已取得座標'}\n\n` +
        '回覆「確認」送出，或「取消」放棄',

    // 送出成功
    SUCCESS_TEMPLATE: (reportId: string) =>
        '✅ 災情回報已送出！\n\n' +
        `回報編號：${reportId.substring(0, 8).toUpperCase()}\n\n` +
        '我們會盡快處理，感謝您的回報！🙏',

    // 取消訊息
    CANCELLED: '❌ 已取消災情回報',

    // 超時訊息
    TIMEOUT: '⏰ 回報已逾時（10分鐘）\n\n' +
        '請重新輸入「回報」開始',

    // 錯誤訊息
    ERROR: {
        INVALID_TEXT: '❓ 請輸入文字描述災情狀況',
        INVALID_IMAGE: '❓ 請上傳照片或輸入「跳過」',
        INVALID_LOCATION: '❓ 請分享位置資訊\n\n' +
            '點擊「+」→「位置資訊」',
        INVALID_CONFIRM: '❓ 請回覆「確認」送出，或「取消」放棄',
        SUBMIT_FAILED: '❌ 送出失敗，請稍後重試\n\n' +
            '如持續發生問題，請聯繫客服',
        GENERAL: '❌ 發生錯誤，請重新輸入「回報」',
    },

    // 預設回覆（非回報流程中）
    DEFAULT_WITH_REPORT_HINT: '🤖 Light Keepers 小秘書\n\n' +
        '可用指令：\n' +
        '🚨 「回報」- 回報災情\n' +
        '📋 「任務」- 查看待辦任務\n' +
        '⏱️ 「時數」- 查看服務時數\n' +
        '✅ 「簽到」- 開始執勤\n' +
        '🔚 「簽退」- 結束執勤',
};

/**
 * 災情類型映射（未來可擴展）
 */
export const DISASTER_TYPE_KEYWORDS: Record<string, string[]> = {
    earthquake: ['地震', '震災', '倒塌'],
    flood: ['水災', '淹水', '洪水', '積水'],
    fire: ['火災', '火警', '起火', '爆炸'],
    typhoon: ['颱風', '風災', '土石流'],
    landslide: ['土石流', '山崩', '落石'],
    traffic: ['車禍', '交通', '事故'],
    infrastructure: ['路燈', '電線', '管線', '倒塌'],
    other: [], // 預設
};

/**
 * 根據描述文字判斷災情類型
 */
export function detectDisasterType(text: string): string {
    const lowerText = text.toLowerCase();

    for (const [type, keywords] of Object.entries(DISASTER_TYPE_KEYWORDS)) {
        if (type === 'other') continue;
        if (keywords.some(kw => lowerText.includes(kw))) {
            return type;
        }
    }

    return 'other';
}
