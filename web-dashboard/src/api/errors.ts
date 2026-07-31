/**
 * API 錯誤處理慣例 — FE-4
 *
 * 全站錯誤訊息一律經由 `getApiErrorMessage()` 取出，取代各頁自造的
 * `err?.response?.data?.message || '...'` 樣板（深掃時全站有 40+ 份複製）。
 *
 * 之所以放在 `src/api/`：錯誤形狀是 client 的一部分。
 * client 換掉（axios → 其他）時，只有這個檔案需要跟著改。
 */
import { AxiosError } from 'axios';

/** 後端統一錯誤回應形狀（NestJS HttpException 預設） */
interface ApiErrorBody {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

/**
 * 從任意 thrown value 取出可顯示給使用者的訊息。
 *
 * 優先序：後端 message → axios 訊息 → Error.message → fallback。
 * NestJS ValidationPipe 會回傳 `message: string[]`，此處合併成單行。
 *
 * @param err     catch 到的值（axios 為 AxiosError，react-query 為 Error）
 * @param fallback 取不到時顯示的中文訊息（**必填**，強制每個呼叫點想清楚語境）
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof AxiosError) {
        const body = err.response?.data as ApiErrorBody | undefined;
        const message = body?.message;
        if (Array.isArray(message) && message.length > 0) return message.join('、');
        if (typeof message === 'string' && message) return message;
        if (body?.error) return body.error;
        // 網路層失敗（CORS / 斷線 / timeout）沒有 response
        if (!err.response) return `${fallback}（網路連線異常）`;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
}

/** HTTP 狀態碼（取不到回 undefined，例如網路層失敗） */
export function getApiErrorStatus(err: unknown): number | undefined {
    return err instanceof AxiosError ? err.response?.status : undefined;
}

/**
 * 是否為「不該重試」的錯誤：4xx 用戶端錯誤重試沒有意義，
 * 只會讓 401 在 refresh 失敗後多打三次。
 *
 * 搭配 react-query：`retry: (count, err) => !isClientError(err) && count < 1`
 */
export function isClientError(err: unknown): boolean {
    const status = getApiErrorStatus(err);
    return status !== undefined && status >= 400 && status < 500;
}

/** react-query `retry` 的全站預設實作（見 main.tsx QueryClient defaultOptions） */
export const defaultQueryRetry = (failureCount: number, err: unknown): boolean =>
    !isClientError(err) && failureCount < 1;
