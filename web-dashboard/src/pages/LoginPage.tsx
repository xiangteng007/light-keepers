import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import './LoginPage.css';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        confirmPassword: '',
    });

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
                const response = await login(formData.email, formData.password);
                localStorage.setItem('accessToken', response.data.accessToken);
                navigate('/dashboard');
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
                const loginResponse = await login(formData.email, formData.password);
                localStorage.setItem('accessToken', loginResponse.data.accessToken);
                navigate('/dashboard');
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || '發生錯誤，請稍後再試');
        } finally {
            setIsLoading(false);
        }
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

                <div className="login-footer">
                    <p>© 2024 曦望燈塔救援協會</p>
                </div>
            </div>
        </div>
    );
}
