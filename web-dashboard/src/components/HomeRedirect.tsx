import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 首頁智能導向
 * 
 * 流程：
 * 1. authReady 前 → 顯示空白（避免閃爍）
 * 2. 未登入 → /login
 * 3. 已登入 → /command-center（不檢查 roleLevel）
 */
export default function HomeRedirect() {
    const { isAuthenticated, authReady } = useAuth();

    // DevMode 跳過
    const devMode = typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true';

    if (!authReady && !devMode) {
        return (
            <div
                style={{
                    width: '100vw',
                    height: '100vh',
                    background: 'var(--layout-bg, #0b111b)',
                }}
                aria-busy="true"
                aria-label="正在驗證身份..."
            />
        );
    }

    if (!isAuthenticated && !devMode) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to="/command-center" replace />;
}
