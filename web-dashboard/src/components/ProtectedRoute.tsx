import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredLevel?: number;
}

/**
 * 受保護路由元件（含 Auth Ready Gating）
 * 
 * 問題修復：
 * - 權限載入完成前不做 redirect，避免「閃跳」
 * - 保留 intended route，登入後可回跳
 * - 區分 401（未登入）vs 403（權限不足）
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
    const { isAuthenticated, user, authReady } = useAuth();
    const location = useLocation();

    // DevMode 完整跳過認證（開發測試用）
    const devModeEnabled = typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true';

    // 🔐 Auth Ready Gating：權限載入完成前不做任何 redirect 決策
    // 這解決了「isLoading 期間誤導頁」的問題
    if (!authReady && !devModeEnabled) {
        // 顯示極簡載入畫面（無閃爍、無 spinner）
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

    // DevMode 時跳過所有認證檢查
    if (devModeEnabled) {
        return <>{children}</>;
    }

    // 公開頁面 (Level 0) - 匿名訪客也可存取，不需要登入
    if (requiredLevel === 0) {
        return <>{children}</>;
    }

    // 🔐 Auth Ready 後才判斷：Level 1+ 頁面需要登入
    // 此時 authReady = true，isAuthenticated 是最終確定的值
    if (!isAuthenticated) {
        // 401 行為：未登入 → 導向登入頁，保留 intended route
        return (
            <Navigate 
                to="/login" 
                state={{ from: location, reason: 'unauthenticated' }} 
                replace 
            />
        );
    }

    // 檢查權限等級（登入用戶）
    const userLevel = user?.roleLevel ?? 0;
    if (userLevel < requiredLevel) {
        // 403 行為：權限不足 → 顯示無權限頁面（不 redirect）
        return (
            <div className="access-denied">
                <div className="access-denied__content">
                    <span className="access-denied__icon">🔒</span>
                    <h2>權限不足</h2>
                    <p>您的權限等級不足以訪問此頁面</p>
                    <p className="access-denied__info">
                        您的身份：<strong>{user?.roleDisplayName || '訪客'}</strong>
                        <br />
                        <small>需要權限等級：{requiredLevel}，您的等級：{userLevel}</small>
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

