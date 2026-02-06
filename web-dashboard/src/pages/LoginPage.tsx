import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api/services';
import { ChevronRight, AlertTriangle, Loader2, Lock } from 'lucide-react';
import '../styles/pages/login-page.css';

/**
 * Lighthouse SVG Logo with animated beacon
 */
const LighthouseLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Base */}
        <path
            d="M35 95 L40 60 L60 60 L65 95 Z"
            fill="#2F3641"
            stroke="#C39B6F"
            strokeWidth="1.5"
        />
        {/* Tower */}
        <path
            d="M38 60 L42 25 L58 25 L62 60 Z"
            fill="#1D2635"
            stroke="#C39B6F"
            strokeWidth="1.5"
        />
        {/* Stripes */}
        <rect x="43" y="35" width="14" height="5" fill="#C39B6F" opacity="0.3" />
        <rect x="44" y="45" width="12" height="5" fill="#C39B6F" opacity="0.3" />
        {/* Lantern Room */}
        <rect
            x="44"
            y="15"
            width="12"
            height="10"
            fill="#13171F"
            stroke="#C39B6F"
            strokeWidth="1.5"
        />
        {/* Dome */}
        <path
            d="M44 15 Q50 8 56 15"
            fill="none"
            stroke="#C39B6F"
            strokeWidth="1.5"
        />
        {/* Beacon Light - Animated */}
        <circle
            cx="50"
            cy="20"
            r="3"
            fill="#C39B6F"
            className="login-lighthouse-beacon"
        />
        {/* Light Rays */}
        <g className="login-lighthouse-beacon" opacity="0.6">
            <line x1="50" y1="20" x2="30" y2="10" stroke="#C39B6F" strokeWidth="1" />
            <line x1="50" y1="20" x2="70" y2="10" stroke="#C39B6F" strokeWidth="1" />
            <line x1="50" y1="20" x2="25" y2="20" stroke="#C39B6F" strokeWidth="1" />
            <line x1="50" y1="20" x2="75" y2="20" stroke="#C39B6F" strokeWidth="1" />
        </g>
    </svg>
);

/**
 * Corner Decorator SVG
 */
const CornerDecorator: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M2 22V2H22" stroke="#C39B6F" strokeWidth="2" strokeLinecap="square" />
    </svg>
);

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiLogin(email, password);

            if (response.data?.accessToken) {
                await login(response.data.accessToken);
                navigate('/dashboard');
            } else {
                throw new Error('No access token received');
            }
        } catch (err: unknown) {
            console.error('Login failed:', err);
            setError('ACCESS DENIED: Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Background Effects */}
            <div className="login-bg-grid" />
            <div className="login-bg-glow login-bg-glow--primary" />
            <div className="login-bg-glow login-bg-glow--secondary" />

            {/* Brand Panel (Desktop Only) */}
            <div className="login-brand-panel">
                <div className="login-brand-content">
                    <LighthouseLogo className="login-lighthouse" />
                    <h1 className="login-brand-title">LIGHT KEEPERS</h1>
                    <p className="login-brand-subtitle">曦望燈塔資訊管理平台</p>
                </div>
            </div>

            {/* Form Panel */}
            <div className="login-form-panel">
                <div className="login-card">
                    {/* Corner Decorators */}
                    <CornerDecorator className="login-corner login-corner--tl" />
                    <CornerDecorator className="login-corner login-corner--tr" />
                    <CornerDecorator className="login-corner login-corner--bl" />
                    <CornerDecorator className="login-corner login-corner--br" />

                    {/* Card Header */}
                    <div className="login-card-header">
                        {/* Status Badge */}
                        <div className="login-status-badge">
                            <div className="login-status-dot" />
                            <span className="login-status-text">System Status: SECURE</span>
                        </div>

                        {/* Mobile Title */}
                        <h1 className="login-mobile-title">LIGHT KEEPERS</h1>
                        <p className="login-mobile-subtitle">曦望燈塔資訊管理平台</p>
                    </div>

                    {/* Card Body */}
                    <div className="login-card-body">
                        <form onSubmit={handleLogin}>
                            {/* Error Message */}
                            {error && (
                                <div className="login-error">
                                    <AlertTriangle size={16} className="login-error-icon" />
                                    <span className="login-error-text">{error}</span>
                                </div>
                            )}

                            {/* Email Input */}
                            <div className="login-form-group">
                                <label className="login-label">Operator ID (Email)</label>
                                <div className="login-input-wrapper">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ENTER ID..."
                                        className="login-input"
                                        required
                                        autoComplete="email"
                                    />
                                    <div className="login-input-trail" />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="login-form-group">
                                <label className="login-label">Access Code (Password)</label>
                                <div className="login-input-wrapper">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="login-input"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <div className="login-input-trail" />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="login-submit"
                            >
                                <span className="login-submit-content">
                                    {isLoading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span>Initiate Uplink</span>
                                            <ChevronRight size={20} strokeWidth={2.5} />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="login-footer">
                        <div className="login-version" title="Restricted Access">
                            <Lock size={10} />
                            <span>VERSION: v2.0.5 // CLASSIFIED</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
