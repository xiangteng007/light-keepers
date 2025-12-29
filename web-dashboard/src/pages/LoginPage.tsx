import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as backendLoginApi } from '../api/services';
import { firebaseAuthService } from '../services/firebase-auth.service';
import './LoginPage.css';

// LINE Login Config
const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID || '';
const LINE_REDIRECT_URI = `${window.location.origin}/login`;

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(true);

    // Email 驗證狀態
    const [otpSent, setOtpSent] = useState(false);            // OTP 已發送
    const [emailVerified, setEmailVerified] = useState(false); // OTP 已驗證
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifyingCode, setIsVerifyingCode] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
    });

    // 取得重定向目標
    const from = (location.state as { from?: string })?.from || '/dashboard';

    // 已登入則跳轉
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // 處理 LINE OAuth callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const verified = urlParams.get('verified');

        if (code && state === 'line-login') {
            handleLineCallback(code);
        }

        // 從 Email 驗證連結返回
        if (verified === 'true') {
            setSuccessMessage('Email 已驗證成功！請登入您的帳號');
            setIsLogin(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleLineCallback = async (code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/auth/line/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, redirectUri: LINE_REDIRECT_URI }),
            });

            const data = await response.json();

            if (data.accessToken) {
                await login(data.accessToken);
                navigate(from, { replace: true });
            } else if (data.needsRegistration) {
                setError('LINE 帳號尚未綁定，請先使用 Email 登入後在設定中綁定 LINE');
            }
        } catch (err) {
            console.error('LINE login failed:', err);
            setError('LINE 登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
        setSuccessMessage(null);
    };

    // Email 註冊 (OTP 驗證後)
    const handleFirebaseRegister = async () => {
        setError(null);
        setIsLoading(true);

        // 確認 Email 已驗證
        if (!emailVerified) {
            setError('請先驗證您的 Email');
            setIsLoading(false);
            return;
        }

        // 驗證密碼
        if (formData.password !== formData.confirmPassword) {
            setError('密碼不一致');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('密碼至少需要 6 個字元');
            setIsLoading(false);
            return;
        }

        try {
            // 使用 Firebase 註冊
            const result = await firebaseAuthService.registerWithEmail(
                formData.email,
                formData.password,
                formData.displayName
            );

            if (result.success) {
                // 註冊成功，取得 Token 並自動登入
                const idToken = await firebaseAuthService.getIdToken();
                if (idToken) {
                    const API_URL = import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1';
                    const response = await fetch(`${API_URL}/auth/firebase/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        await login(data.accessToken, rememberMe);
                        navigate(from, { replace: true });
                        return;
                    }
                }
                // 如果自動登入失敗，提示用戶手動登入
                setSuccessMessage('註冊成功！請使用您的帳號登入');
                setIsLogin(true);
                setEmailVerified(false);
                setOtpSent(false);
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Registration failed:', err);
            setError('註冊失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    // Firebase Email 登入
    const handleFirebaseLogin = async () => {
        setError(null);
        setIsLoading(true);

        try {
            // 使用 Firebase 登入
            const firebaseResult = await firebaseAuthService.loginWithEmail(
                formData.email,
                formData.password
            );

            if (!firebaseResult.success) {
                setError(firebaseResult.message);
                setIsLoading(false);
                return;
            }

            // 檢查 Email 是否已驗證
            const isVerified = await firebaseAuthService.isEmailVerified();
            if (!isVerified) {
                setError('請先驗證您的 Email。點擊下方按鈕重新發送驗證信');
                setIsLoading(false);
                return;
            }

            // 取得 Firebase ID Token
            const idToken = await firebaseAuthService.getIdToken();
            if (!idToken) {
                setError('無法取得認證 Token');
                setIsLoading(false);
                return;
            }

            // 使用 Firebase ID Token 向後端換取系統 JWT
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/auth/firebase/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.accessToken, rememberMe);
                navigate(from, { replace: true });
            } else {
                // 如果後端還未實作 Firebase 登入，使用傳統方式
                try {
                    const backendResponse = await backendLoginApi(formData.email, formData.password);
                    await login(backendResponse.data.accessToken, rememberMe);
                    navigate(from, { replace: true });
                } catch (backendError) {
                    setError('登入失敗，請稍後再試');
                }
            }
        } catch (err) {
            console.error('Firebase login failed:', err);
            setError('登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    // 發送 Email OTP 驗證碼
    const handleResendVerification = async () => {
        if (!formData.email) {
            setError('請先輸入電子郵件');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1';
            const response = await fetch(`${API_URL}/auth/send-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setOtpSent(true);
                setSuccessMessage('驗證碼已發送至您的 Email，請查收');
            } else {
                setError(data.message || '發送失敗，請稍後再試');
            }
        } catch (err) {
            setError('發送失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    // 驗證驗證碼
    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            setError('請輸入完整的6位驗證碼');
            return;
        }

        setIsVerifyingCode(true);
        setError(null);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1';
            const response = await fetch(`${API_URL}/auth/verify-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    code: verificationCode
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // 驗證成功，標記 Email 已驗證
                setEmailVerified(true);
                setSuccessMessage('✓ Email 驗證成功！請填寫以下資料完成註冊');
                setVerificationCode('');
            } else {
                setError(data.message || '驗證碼錯誤，請重新輸入');
            }
        } catch (err) {
            setError('驗證失敗，請稍後再試');
        } finally {
            setIsVerifyingCode(false);
        }
    };

    // 表單提交
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            await handleFirebaseLogin();
        } else {
            await handleFirebaseRegister();
        }
    };

    // Google 登入（使用 Firebase）
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await firebaseAuthService.loginWithGoogle();

            if (!result.success) {
                setError(result.message);
                setIsLoading(false);
                return;
            }

            // 取得 Firebase ID Token
            const idToken = await firebaseAuthService.getIdToken();
            if (!idToken) {
                setError('無法取得認證 Token');
                setIsLoading(false);
                return;
            }

            // 嘗試使用 Firebase Token 登入後端
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/auth/firebase/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.accessToken, true);
                navigate(from, { replace: true });
            } else {
                // Fallback: 嘗試 Google OAuth 流程
                setError('Google 登入設定進行中，請使用 Email 登入');
            }
        } catch (err) {
            console.error('Google login failed:', err);
            setError('Google 登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    // LINE 登入
    const handleLineLogin = () => {
        if (!LINE_CLIENT_ID) {
            setError('LINE 登入尚未設定，請聯繫系統管理員');
            return;
        }
        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINE_REDIRECT_URI)}&state=line-login&scope=profile%20openid`;
        window.location.href = lineAuthUrl;
    };

    // 忘記密碼
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            setError('請輸入 Email');
            return;
        }

        setIsLoading(true);
        try {
            const result = await firebaseAuthService.sendPasswordReset(forgotEmail);
            if (result.success) {
                setSuccessMessage('密碼重設信已發送至您的 Email');
                setShowForgotPassword(false);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('發送失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <h1>Light Keepers</h1>
                        <p className="login-subtitle">曦望燈塔資訊管理平台</p>
                    </div>
                </div>

                {!showForgotPassword ? (
                    <>
                        <div className="login-tabs">
                            <button
                                className={`login-tab ${isLogin ? 'active' : ''}`}
                                onClick={() => {
                                    setIsLogin(true);
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                登入
                            </button>
                            <button
                                className={`login-tab ${!isLogin ? 'active' : ''}`}
                                onClick={() => {
                                    setIsLogin(false);
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                註冊
                            </button>
                        </div>

                        <form className="login-form" onSubmit={handleSubmit}>
                            {/* 註冊模式且 Email 已驗證後才顯示顯示名稱 */}
                            {!isLogin && emailVerified && (
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
                                {!isLogin ? (
                                    <div className="input-with-button">
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            autoComplete="email"
                                            placeholder="請輸入電子郵件"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="inline-btn"
                                            onClick={handleResendVerification}
                                            disabled={isLoading || !formData.email}
                                        >
                                            {otpSent ? '重發' : '發送'}
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        autoComplete="email"
                                        placeholder="請輸入電子郵件"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                )}
                            </div>

                            {/* 註冊時顯示驗證碼欄位 */}
                            {!isLogin && (
                                <div className="form-group">
                                    <label htmlFor="verificationCode">驗證碼</label>
                                    <div className="input-with-button">
                                        <input
                                            type="text"
                                            id="verificationCode"
                                            placeholder="請輸入 6 位數驗證碼"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                        />
                                        <button
                                            type="button"
                                            className="inline-btn"
                                            onClick={handleVerifyCode}
                                            disabled={isVerifyingCode || verificationCode.length < 6}
                                        >
                                            {isVerifyingCode ? '...' : '驗證'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 密碼欄位 - 登入模式或 Email 已驗證後顯示 */}
                            {(isLogin || emailVerified) && (
                                <div className="form-group">
                                    <label htmlFor="password">密碼</label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                                        placeholder="請輸入密碼"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            )}

                            {/* 確認密碼 - 註冊模式且 Email 已驗證後顯示 */}
                            {!isLogin && emailVerified && (
                                <div className="form-group">
                                    <label htmlFor="confirmPassword">確認密碼</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        autoComplete="new-password"
                                        placeholder="請再次輸入密碼"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required={!isLogin && emailVerified}
                                        minLength={6}
                                    />
                                </div>
                            )}

                            {isLogin && (
                                <div className="form-group form-group--checkbox">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span className="checkbox-text">記住我</span>
                                    </label>
                                    <button
                                        type="button"
                                        className="forgot-password-link"
                                        onClick={() => {
                                            setShowForgotPassword(true);
                                            setForgotEmail(formData.email);
                                        }}
                                    >
                                        忘記密碼？
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="login-error">
                                    ⚠️ {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="login-success">
                                    ✅ {successMessage}
                                </div>
                            )}

                            {/* 登入模式或已驗證 Email 後顯示註冊按鈕 */}
                            {(isLogin || emailVerified) && (
                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? '處理中...' : (isLogin ? '登入' : '註冊')}
                                </button>
                            )}

                            {/* 註冊模式但尚未驗證 Email - 顯示提示 */}
                            {!isLogin && !emailVerified && otpSent && (
                                <div className="login-hint">
                                    請輸入驗證碼並點擊「驗證」
                                </div>
                            )}
                        </form>

                        {/* 社群登入 */}
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
                            <p>© 2026 曦望燈塔救援協會</p>
                        </div>
                    </>
                ) : (
                    /* 忘記密碼表單 */
                    <div className="forgot-password-form">
                        <h3>忘記密碼</h3>
                        <p>請輸入您的 Email，我們將發送密碼重設連結</p>

                        <div className="form-group">
                            <label htmlFor="forgotEmail">電子郵件</label>
                            <input
                                type="email"
                                id="forgotEmail"
                                placeholder="請輸入電子郵件"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="login-error">
                                ⚠️ {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="login-success">
                                ✅ {successMessage}
                            </div>
                        )}

                        <button
                            type="button"
                            className="login-submit"
                            onClick={handleForgotPassword}
                            disabled={isLoading}
                        >
                            {isLoading ? '發送中...' : '發送重設連結'}
                        </button>

                        <button
                            type="button"
                            className="login-back-btn"
                            onClick={() => {
                                setShowForgotPassword(false);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                        >
                            ← 返回登入
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
