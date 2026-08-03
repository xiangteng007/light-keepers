import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as apiLogin } from '../../api/services';
// 保留 lucide（R5/T6 誠實清單）：Mail（電子郵件）、Loader2（載入動畫）、LogIn（登入動作）
import { Mail, Loader2, LogIn } from 'lucide-react';
import { ShieldIcon, LockIcon, WarningIcon, CloseIcon } from '../../design-system/icons';
import './LoginModal.css';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Premium Login Modal - Light Theme Design
 * 
 * 設計規格：
 * - 主色：Navy Blue #001F3F
 * - 輔色：Golden Amber #D97706
 * - 背景：白色漸層 + 毛玻璃效果
 * - 圓角：12px
 * 
 * 🔐 PR-04: Deep Link Protection
 * - 登入成功後自動導回 intended route
 */
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { login } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    if (!isOpen) return null;

    const intendedRoute = (location.state as { from?: { pathname: string } })?.from?.pathname;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiLogin(email, password);

            if (response.data && response.data.accessToken) {
                await login(response.data.accessToken);
                onClose();
                
                if (intendedRoute && intendedRoute !== '/') {
                    navigate(intendedRoute, { replace: true });
                }
            } else {
                throw new Error('No access token received');
            }
        } catch (err: unknown) {
            console.error('Login failed:', err);
            setError('登入失敗：帳號或密碼錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
    };

    return (
        <div className="login-modal-overlay" onClick={onClose}>
            {/* Modal Container */}
            <div 
                className="login-modal" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button className="login-modal__close" onClick={onClose} aria-label="關閉">
                    <CloseIcon size={20} aria-hidden="true" />
                </button>

                {/* Header with Brand Bar */}
                <div className="login-modal__header">
                    <div className="login-modal__brand">
                        <ShieldIcon className="login-modal__brand-icon" aria-hidden="true" />
                        <span className="login-modal__brand-text">LIGHTKEEPERS</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="login-modal__content">
                    {/* Title */}
                    <h2 className="login-modal__title">登入系統</h2>
                    <p className="login-modal__subtitle">歡迎回來，守護者</p>

                    {/* Error Message */}
                    {error && (
                        <div className="login-modal__error">
                            <WarningIcon size={16} aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="login-modal__form">
                        {/* Email Field */}
                        <div className={`login-modal__field ${focusedField === 'email' ? 'login-modal__field--focused' : ''}`}>
                            <Mail className="login-modal__field-icon" size={20} aria-hidden="true" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="請輸入電子郵件"
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password Field */}
                        <div className={`login-modal__field ${focusedField === 'password' ? 'login-modal__field--focused' : ''}`}>
                            <LockIcon className="login-modal__field-icon" size={20} aria-hidden="true" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="請輸入密碼"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Forgot Password Link */}
                        <div className="login-modal__forgot">
                            <a href="/forgot-password">忘記密碼？</a>
                        </div>

                        {/* Primary Login Button */}
                        <button 
                            type="submit" 
                            className="login-modal__submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="login-modal__spinner" size={20} />
                                    驗證中...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    開始任務
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="login-modal__divider">
                        <span>或使用以下方式登入</span>
                    </div>

                    {/* Social Login Buttons */}
                    <div className="login-modal__social">
                        <button 
                            type="button" 
                            className="login-modal__social-btn login-modal__social-btn--google"
                            onClick={handleGoogleLogin}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            使用 Google 帳號登入
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
