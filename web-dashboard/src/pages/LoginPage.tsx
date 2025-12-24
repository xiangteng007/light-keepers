import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi, register } from '../api/services';
import './LoginPage.css';

// LINE Login Config - 需要在 LINE Developers Console 設定
const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID || '';
const LINE_REDIRECT_URI = `${window.location.origin}/login`;

// Google Login Config - 需要在 Google Cloud Console 設定
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/login`;

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
    });

    // 取得重定向目標 (登入後跳轉回原頁面)
    const from = (location.state as { from?: string })?.from || '/dashboard';

    // 已登入則跳轉
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // 處理 LINE/Google OAuth callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state === 'line-login') {
            handleLineCallback(code);
        } else if (code && state === 'google-login') {
            handleGoogleCallback(code);
        }
    }, []);

    const handleLineCallback = async (code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // 用 authorization code 換取 access token (需後端處理)
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/auth/line/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, redirectUri: LINE_REDIRECT_URI }),
            });

            const data = await response.json();

            if (data.accessToken) {
                // 已綁定帳號，直接登入
                await login(data.accessToken);
                navigate(from, { replace: true });
            } else if (data.needsRegistration) {
                // 未綁定，需要註冊或綁定
                setError('LINE 帳號尚未綁定，請先使用 Email 登入後在設定中綁定 LINE');
            }
        } catch (err) {
            console.error('LINE login failed:', err);
            setError('LINE 登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
            // 清除 URL 參數
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                const response = await loginApi(formData.email, formData.password);
                await login(response.data.accessToken);
                navigate(from, { replace: true });
            } else {
                if (formData.password !== formData.confirmPassword) {
                    setError('密碼不一致');
                    setIsLoading(false);
                    return;
                }
                await register({
                    email: formData.email,
                    password: formData.password,
                    displayName: formData.displayName,
                });
                // Auto login after registration
                const loginResponse = await loginApi(formData.email, formData.password);
                await login(loginResponse.data.accessToken);
                navigate(from, { replace: true });
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || '發生錯誤，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLineLogin = () => {
        if (!LINE_CLIENT_ID) {
            setError('LINE 登入尚未設定，請聯繫系統管理員');
            return;
        }
        // 導向 LINE 授權頁面
        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINE_REDIRECT_URI)}&state=line-login&scope=profile%20openid`;
        window.location.href = lineAuthUrl;
    };

    const handleGoogleCallback = async (code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/auth/google/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, redirectUri: GOOGLE_REDIRECT_URI }),
            });

            const data = await response.json();

            if (data.accessToken) {
                await login(data.accessToken);
                navigate(from, { replace: true });
            } else if (data.needsRegistration) {
                // Google 帳號可以自動註冊 (因為有 email)
                const registerResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/auth/google/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: data.googleProfile?.id }),
                });

                if (registerResponse.ok) {
                    const regData = await registerResponse.json();
                    await login(regData.accessToken);
                    navigate(from, { replace: true });
                } else {
                    setError('Google 帳號註冊失敗，請稍後再試');
                }
            }
        } catch (err) {
            console.error('Google login failed:', err);
            setError('Google 登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleGoogleLogin = () => {
        if (!GOOGLE_CLIENT_ID) {
            setError('Google 登入尚未設定，請聯繫系統管理員');
            return;
        }
        // 導向 Google 授權頁面
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&state=google-login&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
        window.location.href = googleAuthUrl;
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="login-logo-icon">🏛️</span>
                        <h1>Light Keepers</h1>
                        <p className="login-subtitle">曦望燈塔災情管理平台</p>
                    </div>
                </div>

                <div className="login-tabs">
                    <button
                        className={`login-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(true)}
                    >
                        登入
                    </button>
                    <button
                        className={`login-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(false)}
                    >
                        註冊
                    </button>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="displayName">顯示名稱</label>
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                placeholder="請輸入您的名稱"
                                value={formData.displayName}
                                onChange={handleChange}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">電子郵件</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="請輸入電子郵件"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">密碼</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="請輸入密碼"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">確認密碼</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="請再次輸入密碼"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required={!isLogin}
                                minLength={6}
                            />
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
                        disabled={isLoading}
                    >
                        {isLoading ? '處理中...' : (isLogin ? '登入' : '註冊')}
                    </button>
                </form>

                {/* LINE 快速登入 */}
                <div className="login-divider">
                    <span>或使用其他方式</span>
                </div>

                <button
                    type="button"
                    className="login-line-btn"
                    onClick={handleLineLogin}
                    disabled={isLoading}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.629.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    使用 LINE 登入
                </button>

                {/* Google 快速登入 */}
                <button
                    type="button"
                    className="login-google-btn"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    使用 Google 登入
                </button>

                <div className="login-footer">
                    <p>© 2024 曦望燈塔救援協會</p>
                </div>
            </div>
        </div>
    );
}
