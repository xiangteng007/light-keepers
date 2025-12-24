import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

/**
 * ProtectedRoute - 保護需要登入的路由
 * 
 * @param children - 子元件
 * @param requireAdmin - 是否需要管理員權限
 */
export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // 載入中
    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>驗證中...</p>
            </div>
        );
    }

    // 未登入 - 重定向到登入頁
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 需要管理員但不是管理員
    if (requireAdmin && user?.role !== 'admin') {
        return (
            <div className="access-denied">
                <h2>🚫 權限不足</h2>
                <p>您沒有權限訪問此頁面</p>
            </div>
        );
    }

    return <>{children}</>;
}
