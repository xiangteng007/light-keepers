import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../api/services';
import './LoginPage.css';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('無效的重設連結');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('密碼不一�?);
            return;
        }

        if (password.length < 6) {
            setError('密碼至少需�?6 個字�?);
            return;
        }

        if (!token) {
            setError('無效的重設連結');
            return;
        }

        setIsLoading(true);

        try {
            await resetPassword(token, password);
            setSuccess(true);
            // 3 秒後跳轉到登入頁
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || '重設密碼失敗，連結可能已過�?);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="login-logo-icon">🔑</span>
                        <h1>重設密碼</h1>
                        <p className="login-subtitle">請設定您的新密碼</p>
                    </div>
                </div>

                {success ? (
                    <div className="login-form">
                        <div className="login-success">
                            �?密碼重設成功！即將跳轉至登入頁面...
                        </div>
                        <Link to="/login" className="login-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                            立即登入
                        </Link>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="password">新密�?/label>
                            <input
                                type="password"
                                id="password"
                                placeholder="請輸入新密碼（至�?6 個字元）"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={!token}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">確認新密�?/label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="請再次輸入新密碼"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={!token}
                            />
                        </div>

                        {/* 密碼強度指示 */}
                        {password && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    密碼強度�?
                                    <span style={{
                                        color: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                                            ? '#4CAF50'
                                            : password.length >= 6
                                                ? '#FF9800'
                                                : '#f44336'
                                    }}>
                                        {password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                                            ? ' �?
                                            : password.length >= 6
                                                ? ' �?
                                                : ' �?}
                                    </span>
                                </div>
                                <div style={{
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: 'var(--border-color)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                                            ? '100%'
                                            : password.length >= 6
                                                ? '66%'
                                                : '33%',
                                        background: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                                            ? '#4CAF50'
                                            : password.length >= 6
                                                ? '#FF9800'
                                                : '#f44336',
                                        transition: 'all 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="login-error">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={isLoading || !token}
                        >
                            {isLoading ? '處理�?..' : '確認重設密碼'}
                        </button>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                                �?返回登入
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
