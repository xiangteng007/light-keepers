import React, { useState } from 'react';
import './TwoFactorSetupPage.css';

type SetupStep = 'intro' | 'scan' | 'verify' | 'backup' | 'complete';

export const TwoFactorSetupPage: React.FC = () => {
    const [step, setStep] = useState<SetupStep>('intro');
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState('');
    const [backupCodes] = useState([
        'ABCD-1234-EFGH',
        'IJKL-5678-MNOP',
        'QRST-9012-UVWX',
        'YZAB-3456-CDEF',
        'GHIJ-7890-KLMN',
    ]);

    const secretKey = 'JBSWY3DPEHPK3PXP'; // Example secret
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/LightKeepers:user@example.com?secret=${secretKey}&issuer=LightKeepers`;

    const handleVerify = () => {
        if (verifyCode.length !== 6) {
            setError('請輸入 6 位數驗證碼');
            return;
        }
        // Mock verification
        if (verifyCode === '123456' || verifyCode.length === 6) {
            setStep('backup');
            setError('');
        } else {
            setError('驗證碼錯誤，請重新輸入');
        }
    };

    const renderStep = () => {
        switch (step) {
            case 'intro':
                return (
                    <div className="step-content">
                        <div className="step-icon">🔐</div>
                        <h2>啟用雙因素認證</h2>
                        <p>雙因素認證 (2FA) 為您的帳號增加額外的安全層。</p>
                        <ul className="benefits">
                            <li>✓ 防止未授權登入</li>
                            <li>✓ 即使密碼外洩也能保護帳號</li>
                            <li>✓ 符合資安最佳實踐</li>
                        </ul>
                        <button className="primary-btn" onClick={() => setStep('scan')}>
                            開始設定
                        </button>
                    </div>
                );

            case 'scan':
                return (
                    <div className="step-content">
                        <h2>掃描 QR Code</h2>
                        <p>使用 Google Authenticator 或其他認證 App 掃描</p>
                        <div className="qr-container">
                            <img src={qrDataUrl} alt="2FA QR Code" className="qr-code" />
                        </div>
                        <div className="secret-key">
                            <label>或手動輸入密鑰：</label>
                            <code>{secretKey}</code>
                        </div>
                        <button className="primary-btn" onClick={() => setStep('verify')}>
                            下一步
                        </button>
                    </div>
                );

            case 'verify':
                return (
                    <div className="step-content">
                        <h2>驗證設定</h2>
                        <p>輸入認證 App 顯示的 6 位數驗證碼</p>
                        <div className="verify-input">
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button className="primary-btn" onClick={handleVerify}>
                            驗證
                        </button>
                        <button className="secondary-btn" onClick={() => setStep('scan')}>
                            返回
                        </button>
                    </div>
                );

            case 'backup':
                return (
                    <div className="step-content">
                        <h2>備份碼</h2>
                        <p className="warning">⚠️ 請妥善保存這些備份碼！當您無法使用認證 App 時，可以使用備份碼登入。</p>
                        <div className="backup-codes">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="backup-code">{code}</div>
                            ))}
                        </div>
                        <div className="backup-actions">
                            <button className="secondary-btn" onClick={() => {
                                navigator.clipboard.writeText(backupCodes.join('\n'));
                            }}>
                                📋 複製全部
                            </button>
                        </div>
                        <button className="primary-btn" onClick={() => setStep('complete')}>
                            我已儲存備份碼
                        </button>
                    </div>
                );

            case 'complete':
                return (
                    <div className="step-content">
                        <div className="success-icon">✅</div>
                        <h2>設定完成！</h2>
                        <p>您的雙因素認證已成功啟用。</p>
                        <p>下次登入時，您需要輸入認證 App 中的驗證碼。</p>
                        <button className="primary-btn" onClick={() => window.location.href = '/settings'}>
                            返回設定
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="two-factor-page">
            <div className="setup-card">
                <div className="steps-indicator">
                    {['intro', 'scan', 'verify', 'backup', 'complete'].map((s, i) => (
                        <div key={s} className={`step-dot ${step === s ? 'active' : ''} ${['scan', 'verify', 'backup', 'complete'].indexOf(step) >= i ? 'done' : ''}`}>
                            {i + 1}
                        </div>
                    ))}
                </div>
                {renderStep()}
            </div>
        </div>
    );
};

export default TwoFactorSetupPage;
