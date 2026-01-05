import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 20000, // 20 seconds to handle Cloud Run cold starts
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable sending cookies with requests
});

// Helper: 獲取存儲的 token (from either localStorage or sessionStorage)
const getStoredToken = (): string | null => {
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

// Helper: 清除 token
const clearToken = (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('accessToken');
};

// Helper: 存儲 token
const storeToken = (token: string, remember: boolean = true): void => {
    if (remember) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('rememberMe', 'true');
        sessionStorage.removeItem('accessToken');
    } else {
        sessionStorage.setItem('accessToken', token);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('rememberMe');
    }
};

// Helper: 刷新 Access Token
const refreshAccessToken = async (): Promise<string | null> => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true }
        );

        if (response.data?.accessToken) {
            const remember = localStorage.getItem('rememberMe') === 'true';
            storeToken(response.data.accessToken, remember);
            return response.data.accessToken;
        }
        return null;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
};

// 請求攔截器 - 添加 Token
api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 回應攔截器 - 處理錯誤和自動刷新
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;
        const originalRequest = error.config;

        if (status === 401 && !originalRequest._retry) {
            // 401 = Token 過期或未認證
            originalRequest._retry = true; // 防止無限重試

            // 嘗試刷新 token
            const newToken = await refreshAccessToken();

            if (newToken) {
                // 刷新成功,更新 header 並重試原請求
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            }

            // 刷新失敗,清除 token 並重導向登入頁
            const publicPaths = ['/dashboard', '/map', '/ncdr-alerts', '/forecast', '/manuals', '/login', '/register'];
            const isPublicPath = publicPaths.some(p => currentPath.startsWith(p));

            if (!isPublicPath) {
                clearToken();
                // 保留來源路徑以便登入後返回
                window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            }
        }

        if (status === 403) {
            // 403 = 已登入但權限不足，記錄錯誤但不重導向
            console.warn('權限不足:', error.response?.data?.message || '無法存取此資源');
        }

        return Promise.reject(error);
    }
);

export default api;

