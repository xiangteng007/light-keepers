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

    // 等待驗證完成 - 使用最小化加載指示，減少閃爍
    if (isLoading) {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                background: 'var(--layout-bg, #0b111b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid rgba(195, 155, 111, 0.3)',
                    borderTopColor: 'var(--accent-gold, #C39B6F)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
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

