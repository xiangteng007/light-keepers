/**
 * BiometricPage
 * WebAuthn biometric authentication settings
 *
 * FE-4/3.3: 後端目前無 WebAuthn/生物辨識模組（已掃描全庫，`backend/src/modules` 下無對應
 * controller）。本頁仍顯示寫死的示範資料，並以明顯 banner 標示，避免使用者誤認為真實資料。
 * 待 Phase 4/5 排入後端 WebAuthn API 後再接上。
 */
import { useState } from 'react';
import { Alert } from '../../design-system';
import './BiometricPage.css';

interface Credential {
    id: string;
    deviceName: string;
    deviceType: 'platform' | 'cross-platform';
    createdAt: Date;
    lastUsedAt?: Date;
}

const mockCredentials: Credential[] = [
    { id: '1', deviceName: 'MacBook Pro - Touch ID', deviceType: 'platform', createdAt: new Date('2024-06-01'), lastUsedAt: new Date() },
    { id: '2', deviceName: 'YubiKey 5C', deviceType: 'cross-platform', createdAt: new Date('2024-03-15'), lastUsedAt: new Date(Date.now() - 86400000 * 7) },
];

export default function BiometricPage() {
    const [credentials, setCredentials] = useState(mockCredentials);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleRegister = async () => {
        setIsRegistering(true);
        // Simulate WebAuthn registration
        setTimeout(() => {
            const newCred: Credential = {
                id: Date.now().toString(),
                deviceName: '新裝置',
                deviceType: 'platform',
                createdAt: new Date(),
            };
            setCredentials(prev => [...prev, newCred]);
            setIsRegistering(false);
        }, 2000);
    };

    const handleRemove = (id: string) => {
        if (confirm('確定要移除此安全金鑰嗎？')) {
            setCredentials(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <div className="biometric-page">
            <header className="biometric-page__header">
                <div>
                    <h1>👆 生物辨識</h1>
                    <p>管理 FIDO2/WebAuthn 安全金鑰與生物辨識登入</p>
                </div>
            </header>

            <Alert variant="warning" title="示範資料">
                此頁目前顯示示範資料，功能建置中。後端尚未提供 WebAuthn/生物辨識 API。
            </Alert>

            <div className="biometric-page__info">
                <div className="info-card">
                    <span className="info-icon">🔐</span>
                    <div>
                        <h3>更安全的登入方式</h3>
                        <p>使用生物辨識或安全金鑰取代密碼，防止網路釣魚和帳號盜用。</p>
                    </div>
                </div>
            </div>

            <div className="biometric-page__credentials">
                <div className="section-header">
                    <h2>已註冊的裝置</h2>
                    <button
                        className="register-btn"
                        onClick={handleRegister}
                        disabled={isRegistering}
                    >
                        {isRegistering ? '註冊中...' : '+ 註冊新裝置'}
                    </button>
                </div>

                {credentials.length === 0 ? (
                    <div className="empty-state">
                        <span>🔑</span>
                        <p>尚未註冊任何安全金鑰</p>
                        <button onClick={handleRegister}>註冊第一個裝置</button>
                    </div>
                ) : (
                    <div className="credentials-list">
                        {credentials.map(cred => (
                            <div key={cred.id} className="credential-card">
                                <div className="credential-icon">
                                    {cred.deviceType === 'platform' ? '👆' : '🔑'}
                                </div>
                                <div className="credential-info">
                                    <h4>{cred.deviceName}</h4>
                                    <p>
                                        {cred.deviceType === 'platform' ? '裝置生物辨識' : '安全金鑰'}
                                        • 註冊於 {cred.createdAt.toLocaleDateString('zh-TW')}
                                    </p>
                                    {cred.lastUsedAt && (
                                        <span className="last-used">
                                            最後使用：{cred.lastUsedAt.toLocaleDateString('zh-TW')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="remove-btn"
                                    onClick={() => handleRemove(cred.id)}
                                >
                                    移除
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="biometric-page__support">
                <h3>支援的裝置</h3>
                <div className="support-grid">
                    <div className="support-item">
                        <span>🍎</span>
                        <p>Touch ID / Face ID</p>
                    </div>
                    <div className="support-item">
                        <span>🪟</span>
                        <p>Windows Hello</p>
                    </div>
                    <div className="support-item">
                        <span>🤖</span>
                        <p>Android 生物辨識</p>
                    </div>
                    <div className="support-item">
                        <span>🔑</span>
                        <p>YubiKey / 安全金鑰</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
