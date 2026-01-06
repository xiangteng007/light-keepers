/**
 * API Service - 通用 API 客戶端
 * 提供類 axios 介面的 HTTP 請求方法
 */

const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
}

interface RequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, string>;
}

// 從 localStorage 或 sessionStorage 取得 token
function getAuthToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
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
