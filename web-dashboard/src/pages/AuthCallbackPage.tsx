import React, { useEffect, useState, useRef } from 'react';
import { CheckIcon, WarningIcon } from '../design-system/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OAuth Callback Handler
 * Receives access_token from backend OAuth flow
 * and completes the authentication process.
 * 
 * Build trigger: 2026-02-07T09:30
 */
const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [error, setError] = useState<string | null>(null);
    const processedRef = useRef(false);

    useEffect(() => {
        // Prevent double execution (React StrictMode or re-renders)
        if (processedRef.current) return;
        processedRef.current = true;

        const handleCallback = async () => {
            try {
                const accessToken = searchParams.get('access_token');
                const isNew = searchParams.get('is_new') === 'true';
                const redirectPath = searchParams.get('redirect') || '/dashboard';
                const errorParam = searchParams.get('error');

                // 🔒 Immediately clean sensitive params from URL
                // Prevents token leakage via screenshots, browser history, or sharing
                window.history.replaceState({}, '', '/auth/callback');

                if (errorParam) {
                    const errorMsg = decodeURIComponent(errorParam);
                    console.error('OAuth error from provider:', errorMsg);
                    setStatus('error');
                    setError(errorMsg);
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                if (!accessToken) {
                    setStatus('error');
                    setError('No access token received');
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                // Complete login — stores token + fetches /auth/me
                await login(accessToken);

                setStatus('success');

                // Redirect to target or dashboard
                setTimeout(() => {
                    if (isNew) {
                        navigate('/profile?welcome=true');
                    } else {
                        navigate(decodeURIComponent(redirectPath));
                    }
                }, 1000);

            } catch (err) {
                console.error('OAuth callback error:', err);
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Authentication failed');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Minimal Cyberpunk Loading UI — tokenized to match LoginPage's bespoke dark
    // identity (see LoginPage.tsx R3b note). Locally pinned to the dark palette
    // via the `dark` class so it reads consistently regardless of app-wide theme.
    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)',
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--text-primary)',
        },
        spinner: {
            width: '60px',
            height: '60px',
            border: '3px solid color-mix(in srgb, var(--color-warning-light) 20%, transparent)',
            borderTop: '3px solid var(--color-warning-light)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px',
        },
        title: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '20px',
            color: 'var(--color-warning-light)',
            letterSpacing: '0.15em',
            marginBottom: '8px',
        },
        message: {
            fontSize: '14px',
            color: 'color-mix(in srgb, var(--text-primary) 60%, transparent)',
            letterSpacing: '0.1em',
        },
        error: {
            color: 'var(--color-danger)',
        },
        success: {
            color: 'var(--color-success)',
        },
    };

    // Add keyframes
    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        `;
        document.head.appendChild(styleEl);
        return () => { document.head.removeChild(styleEl); };
    }, []);

    return (
        <div className="dark" style={styles.container} role="status" aria-live="polite">
            {status === 'processing' && (
                <>
                    <div style={styles.spinner} aria-hidden="true" />
                    <h2 style={styles.title}>AUTHENTICATING...</h2>
                    <p style={styles.message}>Establishing secure connection</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <h2 style={{...styles.title, ...styles.success}}><CheckIcon size={20} aria-hidden="true" /> ACCESS GRANTED</h2>
                    <p style={styles.message}>Redirecting to command center...</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <h2 style={{...styles.title, ...styles.error}}><WarningIcon size={20} aria-hidden="true" /> ACCESS DENIED</h2>
                    <p style={{...styles.message, ...styles.error}}>{error}</p>
                    <p style={styles.message}>Redirecting to login...</p>
                </>
            )}
        </div>
    );
};

export default AuthCallbackPage;
