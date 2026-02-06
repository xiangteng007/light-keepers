import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OAuth Callback Handler
 * Receives access_token & refresh_token from backend OAuth flow
 * and completes the authentication process.
 */
const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const accessToken = searchParams.get('access_token');
                const refreshToken = searchParams.get('refresh_token');
                const isNew = searchParams.get('is_new') === 'true';
                const redirectPath = searchParams.get('redirect') || '/dashboard';
                const errorParam = searchParams.get('error');

                if (errorParam) {
                    setStatus('error');
                    setError(decodeURIComponent(errorParam));
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                if (!accessToken) {
                    setStatus('error');
                    setError('No access token received');
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                // Store tokens
                localStorage.setItem('accessToken', accessToken);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }

                // Complete login
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
                setError('Authentication failed');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, login, navigate]);

    // Minimal Cyberpunk Loading UI
    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#fff',
        },
        spinner: {
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255, 191, 36, 0.2)',
            borderTop: '3px solid #FBBF24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px',
        },
        title: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '20px',
            color: '#FBBF24',
            letterSpacing: '0.15em',
            marginBottom: '8px',
        },
        message: {
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '0.1em',
        },
        error: {
            color: '#EF4444',
        },
        success: {
            color: '#22C55E',
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
        <div style={styles.container}>
            {status === 'processing' && (
                <>
                    <div style={styles.spinner} />
                    <h2 style={styles.title}>AUTHENTICATING...</h2>
                    <p style={styles.message}>Establishing secure connection</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <h2 style={{...styles.title, ...styles.success}}>✓ ACCESS GRANTED</h2>
                    <p style={styles.message}>Redirecting to command center...</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <h2 style={{...styles.title, ...styles.error}}>⚠ ACCESS DENIED</h2>
                    <p style={{...styles.message, ...styles.error}}>{error}</p>
                    <p style={styles.message}>Redirecting to login...</p>
                </>
            )}
        </div>
    );
};

export default AuthCallbackPage;
