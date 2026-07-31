/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * Two-Factor Authentication Setup Page
 * User interface for enabling/managing 2FA
 */

import React, { useState, useCallback } from 'react';
import './TwoFactorSetupPage.css';

interface TOTPSetup {
    secret: string;
    otpauth_url: string;
    qrCodeDataUrl?: string;
}

const TwoFactorSetupPage: React.FC = () => {
    const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup' | 'complete'>('intro');
    const [totpData, setTotpData] = useState<TOTPSetup | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const startSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/auth/2fa/setup', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                setTotpData(data.data);
                setStep('setup');
            } else {
                setError(data.message || '設定失敗');
            }
        } catch (err) {
            setError('無法啟動設定流程');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (verificationCode.length !== 6) {
            setError('請輸入 6 位數驗證碼');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verificationCode }),
            });
            const data = await response.json();
            if (data.success) {
                setBackupCodes(data.data.backupCodes);
                setStep('backup');
            } else {
                setError('驗證碼錯誤，請重試');
            }
        } catch (err) {
            setError('驗證失敗');
        } finally {
            setLoading(false);
        }
    };

    const copyBackupCodes = useCallback(() => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        alert('備用碼已複製到剪貼簿');
    }, [backupCodes]);

    const downloadBackupCodes = useCallback(() => {
        const content = `光守護者平台 - 雙因素驗證備用碼\n\n${backupCodes.join('\n')}\n\n請妥善保管這些備用碼。每個備用碼只能使用一次。`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lightkeepers-2fa-backup-codes.txt';
        a.click();
    }, [backupCodes]);

    return (
        <div className="two-factor-page">
            <div className="two-factor-container">
                <header className="two-factor-header">
                    <h1>🔐 雙因素驗證設定</h1>
                    <p>增加帳號安全性，使用驗證器應用程式</p>
                </header>

                {error && <div className="error-message">{error}</div>}

                {step === 'intro' && (
                    <div className="step-intro">
                        <div className="intro-illustration">
                            <span className="big-icon">🛡️</span>
                        </div>
                        <h2>為什麼要啟用雙因素驗證？</h2>
                        <ul className="benefits-list">
                            <li>✅ 即使密碼外洩，帳號仍然安全</li>
                            <li>✅ 防止未授權的帳號存取</li>
                            <li>✅ 符合資安最佳實踐</li>
                        </ul>
                        <div className="requirements">
                            <h3>您需要：</h3>
                            <p>一個驗證器應用程式，例如：</p>
                            <div className="app-badges">
                                <span>Google Authenticator</span>
                                <span>Microsoft Authenticator</span>
                                <span>Authy</span>
                            </div>
                        </div>
                        <button
                            className="primary-btn"
                            onClick={startSetup}
                            disabled={loading}
                        >
                            {loading ? '準備中...' : '開始設定'}
                        </button>
                    </div>
                )}

                {step === 'setup' && totpData && (
                    <div className="step-setup">
                        <h2>步驟 1：掃描 QR Code</h2>
                        <p>使用您的驗證器應用程式掃描以下 QR Code</p>

                        <div className="qr-container">
                            {/* In production, generate actual QR code */}
                            <div className="qr-placeholder">
                                <span>📱</span>
                                <small>QR Code</small>
                            </div>
                        </div>

                        <div className="manual-entry">
                            <p>或手動輸入密鑰：</p>
                            <code className="secret-key">{totpData.secret}</code>
                            <button
                                className="copy-btn"
                                onClick={() => navigator.clipboard.writeText(totpData.secret)}
                            >
                                📋 複製
                            </button>
                        </div>

                        <button
                            className="primary-btn"
                            onClick={() => setStep('verify')}
                        >
                            下一步
                        </button>
                    </div>
                )}

                {step === 'verify' && (
                    <div className="step-verify">
                        <h2>步驟 2：輸入驗證碼</h2>
                        <p>輸入驗證器應用程式顯示的 6 位數驗證碼</p>

                        <div className="code-input-container">
                            <input
                                type="text"
                                className="code-input"
                                maxLength={6}
                                value={verificationCode}
                                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                autoFocus
                            />
                        </div>

                        <div className="button-group">
                            <button
                                className="secondary-btn"
                                onClick={() => setStep('setup')}
                            >
                                返回
                            </button>
                            <button
                                className="primary-btn"
                                onClick={verifyAndEnable}
                                disabled={loading || verificationCode.length !== 6}
                            >
                                {loading ? '驗證中...' : '驗證並啟用'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'backup' && (
                    <div className="step-backup">
                        <h2>步驟 3：保存備用碼</h2>
                        <p className="warning">
                            ⚠️ 這些備用碼將不會再次顯示。請妥善保存！
                        </p>

                        <div className="backup-codes">
                            {backupCodes.map((code, index) => (
                                <code key={index} className="backup-code">{code}</code>
                            ))}
                        </div>

                        <div className="backup-actions">
                            <button className="secondary-btn" onClick={copyBackupCodes}>
                                📋 複製全部
                            </button>
                            <button className="secondary-btn" onClick={downloadBackupCodes}>
                                💾 下載備用碼
                            </button>
                        </div>

                        <label className="confirm-checkbox">
                            <input type="checkbox" id="confirm-saved" />
                            我已安全保存這些備用碼
                        </label>

                        <button
                            className="primary-btn"
                            onClick={() => setStep('complete')}
                        >
                            完成設定
                        </button>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="step-complete">
                        <div className="success-icon">✅</div>
                        <h2>雙因素驗證已啟用！</h2>
                        <p>您的帳號現在更加安全了。</p>
                        <p>下次登入時，您需要輸入驗證器應用程式中的驗證碼。</p>
                        <a href="/dashboard" className="primary-btn">
                            返回儀表板
                        </a>
                    </div>
                )}

                <div className="step-indicator">
                    {['intro', 'setup', 'verify', 'backup', 'complete'].map((s, i) => (
                        <span
                            key={s}
                            className={`step-dot ${step === s ? 'active' : ''} ${['intro', 'setup', 'verify', 'backup', 'complete'].indexOf(step) > i ? 'completed' : ''
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorSetupPage;
