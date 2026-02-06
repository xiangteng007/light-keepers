import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api/services';

/**
 * Light Keepers Login Page
 * Design: Industrial Cyberpunk Command Center
 * Key Feature: Digital Clock Display + Command Center Aesthetic
 */

// Keyframe animations as style element
const keyframes = `
@keyframes beacon-sweep {
  0%, 100% {
    transform: rotate(-45deg);
    opacity: 0.6;
  }
  50% {
    transform: rotate(45deg);
    opacity: 1;
  }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 191, 36, 0.4);
  }
  50% {
    box-shadow: 0 0 60px rgba(255, 191, 36, 0.8);
  }
}

@keyframes clock-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}

@keyframes colon-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes data-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

@keyframes scan-line {
  0%, 100% {
    top: 0%;
  }
  50% {
    top: calc(100% - 2px);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* Responsive breakpoints */
@media (max-width: 480px) {
  .login-container {
    padding: 16px !important;
  }
  .login-card {
    padding: 24px 20px !important;
    margin: 16px !important;
    max-width: calc(100% - 32px) !important;
  }
  .login-title {
    font-size: 24px !important;
    letter-spacing: 0.1em !important;
  }
  .login-subtitle {
    font-size: 12px !important;
  }
  .form-title {
    font-size: 16px !important;
  }
  .input-field {
    padding: 14px 16px !important;
    font-size: 14px !important;
  }
  .submit-btn {
    padding: 16px 24px !important;
    font-size: 12px !important;
  }
  .corner-decorator {
    width: 12px !important;
    height: 12px !important;
  }
}

@media (min-width: 481px) and (max-width: 1024px) {
  .login-container {
    padding: 24px !important;
  }
  .login-card {
    padding: 36px 32px !important;
    max-width: 480px !important;
  }
  .login-title {
    font-size: 32px !important;
  }
}
`;


const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Listen for window resize
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Responsive breakpoint - brand panel only on desktop
    const isDesktop = windowWidth >= 1024;

    useEffect(() => {
        // Add keyframes to document
        const styleEl = document.createElement('style');
        styleEl.innerHTML = keyframes;
        document.head.appendChild(styleEl);
        return () => { document.head.removeChild(styleEl); };
    }, []);

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
                throw new Error('No access token');
            }
        } catch {
            setError('ACCESS DENIED // INVALID CREDENTIALS');
        } finally {
            setIsLoading(false);
        }
    };

    // OAuth Login Handlers
    const handleGoogleLogin = () => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
    };

    const handleLineLogin = () => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${API_BASE_URL}/api/v1/auth/line`;
    };

    // Styles object for inline CSS
    const styles = {
        container: {
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
            fontFamily: "'JetBrains Mono', monospace",
            position: 'relative' as const,
            overflow: 'hidden',
        },
        // Animated background grid
        gridOverlay: {
            position: 'absolute' as const,
            inset: 0,
            backgroundImage: `
                linear-gradient(rgba(255, 191, 36, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 191, 36, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            pointerEvents: 'none' as const,
        },
        // Beacon light sweep effect
        beaconSweep: {
            position: 'absolute' as const,
            top: '-50%',
            left: '50%',
            width: '200%',
            height: '200%',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255, 191, 36, 0.15) 30deg, transparent 60deg)',
            animation: 'beacon-sweep 8s ease-in-out infinite',
            transformOrigin: 'center center',
            pointerEvents: 'none' as const,
        },
        // Left brand panel (only visible on desktop ≥1024px)
        brandPanel: {
            flex: '0 0 45%',
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            position: 'relative' as const,
            borderRight: '1px solid rgba(255, 191, 36, 0.1)',
        },
        // Digital Clock Container
        digitalClockContainer: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            marginBottom: '40px',
            animation: 'clock-flicker 4s ease-in-out infinite',
        },
        // Main Time Display
        timeDisplay: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '72px',
            fontWeight: 800,
            color: '#FBBF24',
            letterSpacing: '0.05em',
            textShadow: '0 0 30px rgba(255, 191, 36, 0.6), 0 0 60px rgba(255, 191, 36, 0.3)',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
        },
        timeColon: {
            animation: 'colon-blink 1s steps(1) infinite',
            margin: '0 4px',
        },
        // Date Display
        dateDisplay: {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '18px',
            color: 'rgba(255, 191, 36, 0.8)',
            letterSpacing: '0.3em',
            marginBottom: '4px',
        },
        // Day of Week
        dayDisplay: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.4)',
            letterSpacing: '0.5em',
            marginBottom: '24px',
        },
        // System Metrics Row
        metricsRow: {
            display: 'flex',
            gap: '24px',
            marginTop: '16px',
        },
        metricBox: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 191, 36, 0.2)',
            borderRadius: '4px',
        },
        metricValue: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '24px',
            fontWeight: 700,
            color: '#00D4FF',
            textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
        },
        metricLabel: {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'rgba(255, 255, 255, 0.4)',
            letterSpacing: '0.15em',
            marginTop: '4px',
        },
        // Mobile Clock Styles (compact version)
        mobileClockContainer: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            paddingTop: '40px',
            paddingBottom: '20px',
        },
        mobileTimeDisplay: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '36px',
            fontWeight: 700,
            color: '#FBBF24',
            textShadow: '0 0 20px rgba(255, 191, 36, 0.5)',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '4px',
        },
        mobileDateDisplay: {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: 'rgba(255, 191, 36, 0.6)',
            letterSpacing: '0.2em',
        },
        brandTitle: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '48px',
            fontWeight: 800,
            letterSpacing: '0.3em',
            color: '#FBBF24',
            textShadow: '0 0 40px rgba(255, 191, 36, 0.5)',
            marginBottom: '16px',
            textAlign: 'center' as const,
        },
        brandSubtitle: {
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.5em',
            textTransform: 'uppercase' as const,
        },
        // Status indicator
        statusBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 191, 36, 0.3)',
            borderRadius: '4px',
            marginTop: '40px',
        },
        statusDot: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22C55E',
            animation: 'pulse-glow 2s ease-in-out infinite',
        },
        statusText: {
            fontSize: '11px',
            color: '#22C55E',
            letterSpacing: '0.2em',
        },
        // Right form panel (main content, always visible)
        formPanel: {
            flex: '1 1 55%',
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent: isDesktop ? 'center' : 'flex-start',
            alignItems: 'center',
            padding: isDesktop ? '40px 24px' : '0 24px 40px 24px',
            position: 'relative' as const,
            minHeight: '100vh',
        },
        // Form card
        formCard: {
            width: '100%',
            maxWidth: '420px',
            background: 'rgba(10, 10, 15, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 191, 36, 0.2)',
            borderRadius: '8px',
            padding: '48px',
            position: 'relative' as const,
            animation: 'fade-in-up 0.8s ease-out',
        },
        // Scan line effect on card
        scanLine: {
            position: 'absolute' as const,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 191, 36, 0.5), transparent)',
            animation: 'scan-line 3s linear infinite',
            pointerEvents: 'none' as const,
        },
        // Corner decorators
        corner: {
            position: 'absolute' as const,
            width: '20px',
            height: '20px',
            border: '2px solid #FBBF24',
        },
        cornerTL: { top: '12px', left: '12px', borderRight: 'none', borderBottom: 'none' },
        cornerTR: { top: '12px', right: '12px', borderLeft: 'none', borderBottom: 'none' },
        cornerBL: { bottom: '12px', left: '12px', borderRight: 'none', borderTop: 'none' },
        cornerBR: { bottom: '12px', right: '12px', borderLeft: 'none', borderTop: 'none' },
        formTitle: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '20px',
            fontWeight: 700,
            color: '#FBBF24',
            letterSpacing: '0.15em',
            marginBottom: '8px',
        },
        formSubtitle: {
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            marginBottom: '32px',
        },
        // Input group
        inputGroup: {
            marginBottom: '24px',
        },
        label: {
            display: 'block',
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            marginBottom: '8px',
        },
        inputWrapper: {
            position: 'relative' as const,
        },
        input: {
            width: '100%',
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: "'JetBrains Mono', monospace",
            outline: 'none',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box' as const,
        },
        inputFocused: {
            borderColor: '#FBBF24',
            boxShadow: '0 0 20px rgba(255, 191, 36, 0.2)',
            background: 'rgba(255, 191, 36, 0.05)',
        },
        // Error message
        errorBox: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            borderRadius: '4px',
            marginBottom: '24px',
        },
        errorText: {
            fontSize: '12px',
            color: '#EF4444',
            letterSpacing: '0.05em',
        },
        // Submit button
        submitBtn: {
            width: '100%',
            padding: '18px 32px',
            background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
            border: 'none',
            borderRadius: '4px',
            color: '#0a0a0f',
            fontSize: '14px',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative' as const,
            overflow: 'hidden',
            marginTop: '8px',
        },
        submitBtnHover: {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 40px rgba(251, 191, 36, 0.4)',
        },
        // Version footer
        versionFooter: {
            textAlign: 'center' as const,
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        },
        versionText: {
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.1em',
        },
        // Mobile styles (will be applied via media query check)
        mobileBrandPanel: {
            display: 'none',
        },
    };

    return (
        <div className="login-container" data-testid="login-page" style={styles.container}>
            {/* Background effects */}
            <div style={styles.gridOverlay} />
            <div style={styles.beaconSweep} />

            {/* Brand Panel - Only visible on desktop (>=1024px) */}
            {isDesktop && (
                <div style={styles.brandPanel}>
                    {/* Digital Clock Display */}
                    <div style={styles.digitalClockContainer}>
                        {/* Main Time */}
                        <div style={styles.timeDisplay}>
                            <span>{currentTime.getHours().toString().padStart(2, '0')}</span>
                            <span style={styles.timeColon}>:</span>
                            <span>{currentTime.getMinutes().toString().padStart(2, '0')}</span>
                            <span style={styles.timeColon}>:</span>
                            <span>{currentTime.getSeconds().toString().padStart(2, '0')}</span>
                        </div>
                        {/* Date */}
                        <div style={styles.dateDisplay}>
                            {currentTime.getFullYear()}.{(currentTime.getMonth() + 1).toString().padStart(2, '0')}.{currentTime.getDate().toString().padStart(2, '0')}
                        </div>
                        {/* Day of Week */}
                        <div style={styles.dayDisplay}>
                            {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][currentTime.getDay()]}
                        </div>
                        {/* System Metrics */}
                        <div style={styles.metricsRow}>
                            <div style={styles.metricBox}>
                                <span style={styles.metricValue}>99.9</span>
                                <span style={styles.metricLabel}>UPTIME %</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricValue}>247</span>
                                <span style={styles.metricLabel}>ACTIVE</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricValue}>0</span>
                                <span style={styles.metricLabel}>ALERTS</span>
                            </div>
                        </div>
                    </div>

                    <h1 style={styles.brandTitle}>LIGHT KEEPERS</h1>
                    <p style={styles.brandSubtitle}>曦望燈塔資訊管理平台</p>

                    <div style={styles.statusBadge}>
                        <div style={styles.statusDot}/>
                        <span style={styles.statusText}>SYSTEM STATUS: OPERATIONAL</span>
                    </div>
                </div>
            )}

            {/* Form Panel */}
            <div style={styles.formPanel}>
                {/* Mobile Clock - shown when brand panel is hidden */}
                {!isDesktop && (
                    <div style={styles.mobileClockContainer}>
                        <div style={styles.mobileTimeDisplay}>
                            <span>{currentTime.getHours().toString().padStart(2, '0')}</span>
                            <span style={styles.timeColon}>:</span>
                            <span>{currentTime.getMinutes().toString().padStart(2, '0')}</span>
                            <span style={styles.timeColon}>:</span>
                            <span>{currentTime.getSeconds().toString().padStart(2, '0')}</span>
                        </div>
                        <div style={styles.mobileDateDisplay}>
                            {currentTime.getFullYear()}.{(currentTime.getMonth() + 1).toString().padStart(2, '0')}.{currentTime.getDate().toString().padStart(2, '0')} {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][currentTime.getDay()]}
                        </div>
                    </div>
                )}

            <div className="login-card" style={styles.formCard}>
                    {/* Scan line effect */}
                    <div style={styles.scanLine}/>
                    
                    {/* Corner decorators */}
                    <div style={{...styles.corner, ...styles.cornerTL}}/>
                    <div style={{...styles.corner, ...styles.cornerTR}}/>
                    <div style={{...styles.corner, ...styles.cornerBL}}/>
                    <div style={{...styles.corner, ...styles.cornerBR}}/>

                    {/* Mobile/Tablet title - shown when brand panel is hidden */}
                    {!isDesktop && (
                        <>
                            <h1 className="login-title" style={{...styles.brandTitle, fontSize: '28px', marginBottom: '4px'}}>LIGHT KEEPERS</h1>
                            <p className="login-subtitle" style={{...styles.brandSubtitle, marginBottom: '32px'}}>曦望燈塔資訊管理平台</p>
                        </>
                    )}

                    <h2 className="form-title" style={styles.formTitle}>OPERATOR LOGIN</h2>
                    <p style={styles.formSubtitle}>Enter your credentials to access the system</p>

                    <form onSubmit={handleLogin}>
                        {error && (
                            <div style={styles.errorBox}>
                                <span style={{color: '#EF4444', fontSize: '16px'}}>⚠</span>
                                <span style={styles.errorText}>{error}</span>
                            </div>
                        )}

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Operator ID</label>
                            <div style={styles.inputWrapper}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="enter.id@domain.com"
                                    style={{
                                        ...styles.input,
                                        ...(focusedField === 'email' ? styles.inputFocused : {}),
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Access Code</label>
                            <div style={styles.inputWrapper}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="••••••••"
                                    style={{
                                        ...styles.input,
                                        ...(focusedField === 'password' ? styles.inputFocused : {}),
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                ...styles.submitBtn,
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(251, 191, 36, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {isLoading ? '◉ AUTHENTICATING...' : 'INITIATE UPLINK →'}
                        </button>
                    </form>

                    {/* Social Login Divider */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        margin: '24px 0 16px 0',
                    }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(251, 191, 36, 0.3)' }} />
                        <span style={{
                            color: 'rgba(251, 191, 36, 0.6)',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '11px',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                        }}>OR CONNECT VIA</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(251, 191, 36, 0.3)' }} />
                    </div>

                    {/* Social Login Buttons Row */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        width: '100%',
                    }}>
                        {/* Google Login Button */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                borderRadius: '4px',
                                color: '#E8E8E8',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '12px',
                                fontWeight: 500,
                                letterSpacing: '1px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            GOOGLE
                        </button>

                        {/* LINE Login Button */}
                        <button
                            type="button"
                            onClick={handleLineLogin}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '14px 16px',
                                background: 'rgba(0, 195, 0, 0.1)',
                                border: '1px solid rgba(0, 195, 0, 0.4)',
                                borderRadius: '4px',
                                color: '#00C300',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '12px',
                                fontWeight: 500,
                                letterSpacing: '1px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 195, 0, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(0, 195, 0, 0.7)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 195, 0, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(0, 195, 0, 0.4)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#00C300" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                            </svg>
                            LINE
                        </button>
                    </div>

                    <div style={styles.versionFooter}>
                        <span style={styles.versionText}>VERSION 2.1.0 // CLASSIFIED // LEVEL-5 CLEARANCE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
