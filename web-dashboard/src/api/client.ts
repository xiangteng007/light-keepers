import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
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

// 請求攔截器 - 添加 Token
api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 回應攔截器 - 處理錯誤
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;

        if (status === 401) {
            // 401 = 需要登入但未登入或 token 過期
            // 只有在非公開頁面時才清除 token 並重導向
            const publicPaths = ['/dashboard', '/map', '/ncdr-alerts', '/forecast', '/manuals', '/login', '/register'];
            const isPublicPath = publicPaths.some(p => currentPath.startsWith(p));

            if (!isPublicPath) {
                clearToken();
                // 保留來源路徑以便登入後返回
                window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            }
            // 公開頁面的 401 錯誤不重導向，讓組件自行處理
        }

        if (status === 403) {
            // 403 = 已登入但權限不足，記錄錯誤但不重導向
            console.warn('權限不足:', error.response?.data?.message || '無法存取此資源');
        }

        return Promise.reject(error);
    }
);

export default api;

