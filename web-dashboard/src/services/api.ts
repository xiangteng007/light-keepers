/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * API Service - 通用 API 客戶端（fetch 版）
 * 提供類 axios 介面的 HTTP 請求方法
 *
 * ⚠️ 過渡檔案（TRANSITIONAL）
 * 本檔與 `src/api/client.ts`（axios，含 401 auto-refresh mutex）、
 * `src/utils/api.ts`（axios，含 401 redirect）功能重疊，是歷史遺留的第三套 client。
 * Phase 3 會統一整併到 `src/api/client.ts`，屆時本檔應刪除。
 * 在整併完成前，此處的 token key / baseURL 必須與 `src/api/client.ts` 保持一致。
 *
 * XC-1 修復紀錄：
 * - token key 原為 'token'，但全站實際寫入的是 'accessToken'（見 api/client.ts TOKEN_KEY），
 *   導致 getAuthToken() 永遠回傳 null → 使用本檔的 4 個頁面
 *   (ApprovalCenterPage / DroneControlPage / EquipmentPage / TriagePage)
 *   送出的請求完全沒有 Authorization header。
 * - baseURL 原為 VITE_API_URL（缺少 `/api/v1` 版本前綴），與後端
 *   `app.setGlobalPrefix('api/v1')` 不符，請求一律 404。
 */

const API_ROOT_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** 版本化 API base，需與 src/api/client.ts 的 axios baseURL 一致 */
const API_URL = `${API_ROOT_URL}/api/v1`;

/** Token 儲存 key —— 必須與 src/api/client.ts 的 TOKEN_KEY 相同 */
const TOKEN_KEY = 'accessToken';

interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
}

interface RequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, string>;
}

// 從 localStorage 或 sessionStorage 取得 token（與 api/client.ts getStoredToken 同語意）
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

// 建立請求 headers
function createHeaders(config?: RequestConfig): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...config?.headers,
    };

    const token = getAuthToken();
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

// 處理回應
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return {
        data,
        status: response.status,
        statusText: response.statusText,
    };
}

// 建立 URL 參數
function buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = `${API_URL}${endpoint}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, value);
        }
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
}

// API 客戶端
const api = {
    async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
        const url = buildUrl(endpoint, config?.params);
        const response = await fetch(url, {
            method: 'GET',
            headers: createHeaders(config),
        });
        return handleResponse<T>(response);
    },

    async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        const url = buildUrl(endpoint, config?.params);
        const response = await fetch(url, {
            method: 'POST',
            headers: createHeaders(config),
            body: data ? JSON.stringify(data) : undefined,
        });
        return handleResponse<T>(response);
    },

    async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        const url = buildUrl(endpoint, config?.params);
        const response = await fetch(url, {
            method: 'PUT',
            headers: createHeaders(config),
            body: data ? JSON.stringify(data) : undefined,
        });
        return handleResponse<T>(response);
    },

    async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        const url = buildUrl(endpoint, config?.params);
        const response = await fetch(url, {
            method: 'PATCH',
            headers: createHeaders(config),
            body: data ? JSON.stringify(data) : undefined,
        });
        return handleResponse<T>(response);
    },

    async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
        const url = buildUrl(endpoint, config?.params);
        const response = await fetch(url, {
            method: 'DELETE',
            headers: createHeaders(config),
        });
        return handleResponse<T>(response);
    },
};

export default api;
