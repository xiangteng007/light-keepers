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
        if (error.response?.status === 401) {
            clearToken();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

