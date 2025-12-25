import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bindLineAccount } from '../api/services';
import './LoginPage.css';

/**
 * LINE 帳號綁定頁面
 * 用戶從 LINE BOT 點擊綁定連結後會跳轉到此頁面
 */
export default function BindLinePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [status, setStatus] = useState<'loading' | 'needLogin' | 'binding' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    // 從 URL 取得綁定 token
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('綁定連結無效，請重新從 LINE 發送「綁定」取得連結。');
            return;
        }

        // 解析 token 取得 LINE User ID
        try {
            const decoded = atob(token);
            const [lineUserId] = decoded.split(':');

            if (!lineUserId) {
                setStatus('error');
                setMessage('綁定連結格式錯誤。');
                return;
            }

            // 檢查登入狀態
            if (!isAuthenticated) {
                setStatus('needLogin');
                // 儲存 token 到 sessionStorage，登入後繼續綁定
                sessionStorage.setItem('line_binding_token', token);
                return;
            }

            // 已登入，執行綁定
            performBinding(lineUserId);
        } catch {
            setStatus('error');
            setMessage('綁定連結解析失敗。');
        }
    }, [token, isAuthenticated, user]);

    const performBinding = async (lineUserId: string) => {
        if (!user?.id) {
            setStatus('error');
            setMessage('無法取得用戶資訊，請重新登入後再試。');
            return;
        }

        setStatus('binding');
        try {
            const response = await bindLineAccount(user.id, lineUserId);
            if (response.data.success) {
                setStatus('success');
                setMessage('LINE 帳號綁定成功！您現在可以透過 LINE 接收任務通知和災害警報。');
                // 清除 sessionStorage
                sessionStorage.removeItem('line_binding_token');
            } else {
                setStatus('error');
                setMessage(response.data.message || '綁定失敗，請稍後再試。');
            }
        } catch (err) {
            console.error('Binding error:', err);
            setStatus('error');
            setMessage('綁定過程發生錯誤，請稍後再試。');
        }
    };

    const handleLogin = () => {
        // 導向登入頁，攜帶返回資訊
        navigate('/login', { state: { from: `/bind-line?token=${token}` } });
    };

    const handleGoHome = () => {
        navigate('/dashboard');
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    {/* Logo */}
                    <div className="login-header">
                        <div className="logo-container">
                            <div className="logo-icon">🔗</div>
                        </div>
                        <h1 className="login-title">LINE 帳號綁定</h1>
                        <p className="login-subtitle">將 LINE 與您的志工帳號連結</p>
                    </div>

                    {/* 狀態顯示 */}
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        {status === 'loading' && (
                            <div>
                                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                <p>處理中...</p>
                            </div>
                        )}

                        {status === 'needLogin' && (
                            <div>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
                                <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                                    請先登入
                                </h2>
                                <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                                    請登入您的志工帳號以完成 LINE 綁定
                                </p>
                                <button
                                    onClick={handleLogin}
                                    className="login-button"
                                    style={{ width: '100%' }}
                                >
                                    前往登入
                                </button>
                            </div>
                        )}

                        {status === 'binding' && (
                            <div>
                                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                <p>正在綁定帳號...</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                                <h2 style={{ marginBottom: '1rem', color: 'var(--color-success)' }}>
                                    綁定成功！
                                </h2>
                                <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                                    {message}
                                </p>
                                <button
                                    onClick={handleGoHome}
                                    className="login-button"
                                    style={{ width: '100%' }}
                                >
                                    前往儀表板
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                                <h2 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>
                                    綁定失敗
                                </h2>
                                <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                                    {message}
                                </p>
                                <button
                                    onClick={handleGoHome}
                                    className="login-button secondary"
                                    style={{ width: '100%' }}
                                >
                                    返回首頁
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
