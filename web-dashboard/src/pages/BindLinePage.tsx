import { useState, useEffect } from 'react';
import { WebhookIcon, SyncIcon, ShieldIcon, CheckIcon, CloseIcon } from '../design-system/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bindLineAccount } from '../api/services';
import { Button } from '../design-system';
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
                <div className="login-header">
                    <div className="login-logo">
                        <span className="login-logo-icon" aria-hidden="true"><WebhookIcon size={32} /></span>
                        <h1>LINE 帳號綁定</h1>
                        <p className="login-subtitle">將 LINE 與您的志工帳號連結</p>
                    </div>
                </div>

                {/* 狀態顯示 */}
                <div className="login-form" style={{ textAlign: 'center' }} role="status" aria-live="polite">
                    {status === 'loading' && (
                        <div>
                            <SyncIcon size={40} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)' }} aria-hidden="true" />
                            <p>處理中...</p>
                        </div>
                    )}

                    {status === 'needLogin' && (
                        <div>
                            <ShieldIcon size={56} aria-hidden="true" style={{ marginBottom: '1rem', color: 'var(--color-info)' }} />
                            <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                請先登入
                            </h2>
                            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                                請登入您的志工帳號以完成 LINE 綁定
                            </p>
                            <Button variant="primary" onClick={handleLogin} style={{ width: '100%' }}>
                                前往登入
                            </Button>
                        </div>
                    )}

                    {status === 'binding' && (
                        <div>
                            <SyncIcon size={40} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)' }} aria-hidden="true" />
                            <p>正在綁定帳號...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <CheckIcon size={56} aria-hidden="true" style={{ marginBottom: '1rem', color: 'var(--color-success)' }} />
                            <h2 style={{ marginBottom: '1rem', color: 'var(--color-success)' }}>
                                綁定成功！
                            </h2>
                            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                                {message}
                            </p>
                            <Button variant="primary" onClick={handleGoHome} style={{ width: '100%' }}>
                                前往儀表板
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <CloseIcon size={56} aria-hidden="true" style={{ marginBottom: '1rem', color: 'var(--color-danger)' }} />
                            <h2 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>
                                綁定失敗
                            </h2>
                            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                                {message}
                            </p>
                            <Button variant="secondary" onClick={handleGoHome} style={{ width: '100%' }}>
                                返回首頁
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
