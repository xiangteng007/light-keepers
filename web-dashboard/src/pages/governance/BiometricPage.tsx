/**
 * BiometricPage
 * WebAuthn biometric authentication settings
 *
 * FE-4/3.3: 後端目前無 WebAuthn/生物辨識模組（已掃描全庫，`backend/src/modules` 下無對應
 * controller）。本頁仍顯示寫死的示範資料，並以明顯 banner 標示，避免使用者誤認為真實資料。
 * 待 Phase 4/5 排入後端 WebAuthn API 後再接上。
 */
import { useState } from 'react';
import { Fingerprint, KeyRound, ShieldCheck, Apple, MonitorSmartphone, Smartphone, Trash2 } from 'lucide-react';
import { Alert, Button, Card, Tag } from '../../design-system';
import EmptyState from '../../components/shared/EmptyState';
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

const SUPPORTED_DEVICES = [
    { icon: Apple, label: 'Touch ID / Face ID' },
    { icon: MonitorSmartphone, label: 'Windows Hello' },
    { icon: Smartphone, label: 'Android 生物辨識' },
    { icon: KeyRound, label: 'YubiKey / 安全金鑰' },
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
            <div className="page-header">
                <div className="page-header__text">
                    <h1><Fingerprint size={24} aria-hidden="true" /> 生物辨識</h1>
                    <p>管理 FIDO2/WebAuthn 安全金鑰與生物辨識登入</p>
                </div>
                <Button
                    variant="primary"
                    onClick={handleRegister}
                    disabled={isRegistering}
                    loading={isRegistering}
                    icon={isRegistering ? undefined : <Fingerprint size={16} aria-hidden="true" />}
                >
                    {isRegistering ? '註冊中...' : '註冊新裝置'}
                </Button>
            </div>

            <Alert variant="warning" title="示範資料">
                此頁目前顯示示範資料，功能建置中。後端尚未提供 WebAuthn/生物辨識 API。
            </Alert>

            <Card icon={<ShieldCheck size={28} aria-hidden="true" />} title="更安全的登入方式">
                使用生物辨識或安全金鑰取代密碼，防止網路釣魚和帳號盜用。
            </Card>

            <section className="biometric-page__credentials">
                <h2 className="section-title">已註冊的裝置</h2>

                {credentials.length === 0 ? (
                    <EmptyState
                        icon={KeyRound}
                        title="尚未註冊任何安全金鑰"
                        description="註冊裝置後即可使用生物辨識或安全金鑰快速登入。"
                        action={{ label: '註冊第一個裝置', onClick: handleRegister }}
                    />
                ) : (
                    <div className="credentials-list">
                        {credentials.map(cred => (
                            <div key={cred.id} className="credential-card">
                                <div className="credential-icon">
                                    {cred.deviceType === 'platform'
                                        ? <Fingerprint size={22} aria-hidden="true" />
                                        : <KeyRound size={22} aria-hidden="true" />}
                                </div>
                                <div className="credential-info">
                                    <h4>{cred.deviceName}</h4>
                                    <p>
                                        <Tag size="sm">{cred.deviceType === 'platform' ? '裝置生物辨識' : '安全金鑰'}</Tag>
                                        <span className="credential-registered">
                                            註冊於 {cred.createdAt.toLocaleDateString('zh-TW')}
                                        </span>
                                    </p>
                                    {cred.lastUsedAt && (
                                        <span className="last-used">
                                            最後使用：{cred.lastUsedAt.toLocaleDateString('zh-TW')}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleRemove(cred.id)}
                                    icon={<Trash2 size={14} aria-hidden="true" />}
                                    aria-label={`移除裝置：${cred.deviceName}`}
                                >
                                    移除
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="biometric-page__support">
                <h3 className="section-title">支援的裝置</h3>
                <div className="support-grid">
                    {SUPPORTED_DEVICES.map(({ icon: Icon, label }) => (
                        <div key={label} className="support-item">
                            <Icon size={26} aria-hidden="true" />
                            <p>{label}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
