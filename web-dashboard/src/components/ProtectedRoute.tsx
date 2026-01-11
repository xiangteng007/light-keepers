import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredLevel?: number;
}

/**
 * 受保護路由元件
 * - Level 0 頁面允許匿名訪客存取
 * - Level 1+ 頁面未登入者導向登入頁
 * - 已登入但權限不足者顯示錯誤
 * 
 * requiredLevel 對應：
 * 0 = 公開 (匿名訪客可存取)
 * 1 = 登記志工
 * 2 = 幹部
 * 3 = 常務理事
 * 4 = 理事長
 * 5 = 系統擁有者
 */
export default function ProtectedRoute({ children, requiredLevel = 1 }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // 快速判斷: 如果 devMode 開啟或已有用戶，跳過加載畫面（減少閃爍）
    const devModeEnabled = typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true';
    const shouldSkipLoading = devModeEnabled || user !== null;

    // 等待驗證完成 - 只有在真正需要等待時才顯示（且使用最小化指示）
    if (isLoading && !shouldSkipLoading) {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                background: 'var(--layout-bg, #0b111b)',
            }} />
        );
    }

    // 公開頁面 (Level 0) - 匿名訪客也可存取，不需要登入
    if (requiredLevel === 0) {
        return <>{children}</>;
    }

    // Level 1+ 頁面：未登入導向登入頁
    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 檢查權限等級（匿名用戶 = Level 0）
    const userLevel = user?.roleLevel ?? 0;
    if (userLevel < requiredLevel) {
        return (
            <div className="access-denied">
                <div className="access-denied__content">
                    <span className="access-denied__icon">🔒</span>
                    <h2>權限不足</h2>
                    <p>您的權限等級不足以訪問此頁面</p>
                    <p className="access-denied__info">
                        您的身份：<strong>{user?.roleDisplayName || '訪客'}</strong>
                    </p>
                    <a href="/dashboard" className="lk-btn lk-btn--primary">
                        返回儀表板
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

