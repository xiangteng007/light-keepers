/**
 * Two-Factor Authentication Setup Modal
 * 
 * Modal component for setting up TOTP-based 2FA
 * v1.0
 */

import React, { useState, useEffect } from 'react';
import {
    X,
    Shield,
    Smartphone,
    Key,
    Copy,
    Check,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import styles from './TwoFactorSetupModal.module.css';

interface TwoFactorSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface SetupData {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}

type Step = 'intro' | 'scan' | 'verify' | 'backup' | 'complete';

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [step, setStep] = useState<Step>('intro');
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep('intro');
            setSetupData(null);
            setVerifyCode('');
            setError(null);
        }
    }, [isOpen]);

    const handleStartSetup = async () => {
        setLoading(true);
        setError(null);

        try {
            // Mock API call - replace with real API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock response
            setSetupData({
                secret: 'JBSWY3DPEHPK3PXP',
                qrCode: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIj5RUiBDb2RlPC90ZXh0Pjwvc3ZnPg==',
                backupCodes: [
                    'ABCD-1234-EFGH',
                    'IJKL-5678-MNOP',
                    'QRST-9012-UVWX',
                    'YZAB-3456-CDEF',
                    'GHIJ-7890-KLMN',
                ],
            });
            setStep('scan');
        } catch (err: any) {
            setError(err.message || '設定失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (verifyCode.length !== 6) {
            setError('請輸入 6 位數驗證碼');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Mock API call - replace with real API
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock verification
            if (verifyCode === '123456' || verifyCode.length === 6) {
                setStep('backup');
            } else {
                throw new Error('驗證碼錯誤');
            }
        } catch (err: any) {
            setError(err.message || '驗證失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleCopySecret = () => {
        if (setupData) {
            navigator.clipboard.writeText(setupData.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyBackupCodes = () => {
        if (setupData) {
            navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleComplete = () => {
        setStep('complete');
        onSuccess?.();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Shield size={24} className={styles.headerIcon} />
                        <h2>設定兩步驟驗證</h2>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className={styles.progress}>
                    {(['intro', 'scan', 'verify', 'backup', 'complete'] as Step[]).map((s, i) => (
                        <div
                            key={s}
                            className={`${styles.progressStep} ${step === s ? styles.active : ''} ${['intro', 'scan', 'verify', 'backup', 'complete'].indexOf(step) > i ? styles.done : ''
                                }`}
                        >
                            <span className={styles.progressDot}>{i + 1}</span>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Step 1: Intro */}
                    {step === 'intro' && (
                        <div className={styles.stepContent}>
                            <div className={styles.iconLarge}>
                                <Smartphone size={48} />
                            </div>
                            <h3>準備您的驗證器 App</h3>
                            <p>
                                兩步驟驗證會在您登入時要求輸入驗證碼，大幅提升帳戶安全性。
                            </p>
                            <ul className={styles.appList}>
                                <li>Google Authenticator</li>
                                <li>Microsoft Authenticator</li>
                                <li>Authy</li>
                            </ul>
                            <button
                                className={styles.primaryButton}
                                onClick={handleStartSetup}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className={styles.spinner} size={18} /> : null}
                                開始設定
                            </button>
                        </div>
                    )}

                    {/* Step 2: Scan QR */}
                    {step === 'scan' && setupData && (
                        <div className={styles.stepContent}>
                            <h3>掃描 QR Code</h3>
                            <p>使用驗證器 App 掃描下方的 QR Code</p>

                            <div className={styles.qrContainer}>
                                <img src={setupData.qrCode} alt="QR Code" className={styles.qrCode} />
                            </div>

                            <div className={styles.secretBox}>
                                <span className={styles.secretLabel}>無法掃描？手動輸入金鑰：</span>
                                <div className={styles.secretValue}>
                                    <code>{setupData.secret}</code>
                                    <button onClick={handleCopySecret} title="複製">
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                className={styles.primaryButton}
                                onClick={() => setStep('verify')}
                            >
                                下一步
                            </button>
                        </div>
                    )}

                    {/* Step 3: Verify */}
                    {step === 'verify' && (
                        <div className={styles.stepContent}>
                            <h3>輸入驗證碼</h3>
                            <p>請輸入驗證器 App 顯示的 6 位數代碼</p>

                            <div className={styles.codeInput}>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={verifyCode}
                                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className={styles.error}>
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                className={styles.primaryButton}
                                onClick={handleVerify}
                                disabled={loading || verifyCode.length !== 6}
                            >
                                {loading ? <Loader2 className={styles.spinner} size={18} /> : null}
                                驗證
                            </button>
                        </div>
                    )}

                    {/* Step 4: Backup Codes */}
                    {step === 'backup' && setupData && (
                        <div className={styles.stepContent}>
                            <div className={styles.iconLarge}>
                                <Key size={48} />
                            </div>
                            <h3>保存備用碼</h3>
                            <p>
                                當您無法使用驗證器 App 時，可以使用備用碼登入。
                                請將這些代碼保存在安全的地方。
                            </p>

                            <div className={styles.backupCodesBox}>
                                {setupData.backupCodes.map((code, i) => (
                                    <div key={i} className={styles.backupCode}>
                                        {code}
                                    </div>
                                ))}
                            </div>

                            <button
                                className={styles.secondaryButton}
                                onClick={handleCopyBackupCodes}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                複製全部
                            </button>

                            <button
                                className={styles.primaryButton}
                                onClick={handleComplete}
                            >
                                我已保存備用碼
                            </button>
                        </div>
                    )}

                    {/* Step 5: Complete */}
                    {step === 'complete' && (
                        <div className={styles.stepContent}>
                            <div className={`${styles.iconLarge} ${styles.success}`}>
                                <Check size={48} />
                            </div>
                            <h3>設定完成！</h3>
                            <p>
                                您的帳戶現在受到兩步驟驗證的保護。
                                下次登入時，請準備好您的驗證器 App。
                            </p>

                            <button
                                className={styles.primaryButton}
                                onClick={onClose}
                            >
                                完成
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorSetupModal;
