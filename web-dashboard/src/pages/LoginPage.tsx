import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api/services';

/**
 * Light Keepers Login Page
 * Design: Industrial Cyberpunk Command Center
 * Key Feature: Animated lighthouse beacon sweep effect
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

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
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
        // Left brand panel
        brandPanel: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px',
            position: 'relative' as const,
            borderRight: '1px solid rgba(255, 191, 36, 0.1)',
        },
        // Lighthouse icon
        lighthouse: {
            width: '180px',
            height: '180px',
            marginBottom: '40px',
            animation: 'float 6s ease-in-out infinite',
            filter: 'drop-shadow(0 0 30px rgba(255, 191, 36, 0.5))',
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
        // Right form panel
        formPanel: {
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            position: 'relative' as const,
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

    // Check if mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    return (
        <div className="login-container" style={styles.container}>
            {/* Background effects */}
            <div style={styles.gridOverlay} />
            <div style={styles.beaconSweep} />

            {/* Brand Panel - Hidden on mobile */}
            {!isMobile && (
                <div style={styles.brandPanel}>
                    {/* Lighthouse SVG */}
                    <svg style={styles.lighthouse} viewBox="0 0 100 120" fill="none">
                        {/* Base */}
                        <path d="M30 115 L35 70 L65 70 L70 115 Z" fill="#1a1a2e" stroke="#FBBF24" strokeWidth="1.5"/>
                        {/* Tower */}
                        <path d="M35 70 L40 25 L60 25 L65 70 Z" fill="#0f0f1a" stroke="#FBBF24" strokeWidth="1.5"/>
                        {/* Stripes */}
                        <rect x="42" y="35" width="16" height="6" fill="#FBBF24" opacity="0.3"/>
                        <rect x="43" y="48" width="14" height="6" fill="#FBBF24" opacity="0.3"/>
                        {/* Lantern room */}
                        <rect x="42" y="12" width="16" height="13" fill="#1a1a2e" stroke="#FBBF24" strokeWidth="1.5"/>
                        {/* Dome */}
                        <path d="M42 12 Q50 2 58 12" fill="none" stroke="#FBBF24" strokeWidth="2"/>
                        {/* Beacon */}
                        <circle cx="50" cy="18.5" r="5" fill="#FBBF24" filter="url(#glow)"/>
                        {/* Light rays */}
                        <g opacity="0.6" stroke="#FBBF24" strokeWidth="1.5">
                            <line x1="50" y1="18" x2="20" y2="5"/>
                            <line x1="50" y1="18" x2="80" y2="5"/>
                            <line x1="50" y1="18" x2="10" y2="18"/>
                            <line x1="50" y1="18" x2="90" y2="18"/>
                        </g>
                        {/* Glow filter */}
                        <defs>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="blur"/>
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                    </svg>

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
            <div className="login-card" style={styles.formCard}>
                    {/* Scan line effect */}
                    <div style={styles.scanLine}/>
                    
                    {/* Corner decorators */}
                    <div style={{...styles.corner, ...styles.cornerTL}}/>
                    <div style={{...styles.corner, ...styles.cornerTR}}/>
                    <div style={{...styles.corner, ...styles.cornerBL}}/>
                    <div style={{...styles.corner, ...styles.cornerBR}}/>

                    {/* Mobile title */}
                    {isMobile && (
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

                    <div style={styles.versionFooter}>
                        <span style={styles.versionText}>VERSION 2.1.0 // CLASSIFIED // LEVEL-5 CLEARANCE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
