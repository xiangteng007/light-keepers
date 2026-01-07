import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/services';
import './LoginPage.css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await forgotPassword({ email });
            setSuccess(true);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || '發送失敗，請稍後再�?);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="login-logo-icon">🔐</span>
                        <h1>忘記密碼</h1>
                        <p className="login-subtitle">輸入您的電子郵件以重設密�?/p>
                    </div>
                </div>

                {success ? (
                    <div className="login-form">
                        <div className="login-success">
                            �?重設連結已發送至您的信箱，請檢查您的電子郵件（包含垃圾郵件資料夾�?
                        </div>
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            如果您未收到郵件，請稍等幾分鐘或再次嘗試�?
                        </p>
                        <Link to="/login" className="login-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                            返回登入
                        </Link>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">電子郵件</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="請輸入註冊時使用的電子郵�?
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="login-error">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={isLoading}
                        >
                            {isLoading ? '發送中...' : '發送重設連結'}
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
