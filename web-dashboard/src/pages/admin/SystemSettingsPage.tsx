/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * System Settings Page
 * Admin page for managing system configuration
 */

import React, { useState, useEffect } from 'react';
import './SystemSettingsPage.css';

interface SystemSettings {
    site: {
        name: string;
        description: string;
        contactEmail: string;
        timezone: string;
    };
    sos: {
        enabled: boolean;
        cooldownMinutes: number;
        autoAcknowledgeMinutes: number;
    };
    notifications: {
        pushEnabled: boolean;
        emailEnabled: boolean;
        lineEnabled: boolean;
        smsEnabled: boolean;
    };
    security: {
        sessionTimeoutMinutes: number;
        maxLoginAttempts: number;
        requireMfa: boolean;
    };
}

const defaultSettings: SystemSettings = {
    site: {
        name: '光守護者防災平台',
        description: 'AI 智慧災害防救系統',
        contactEmail: 'admin@lightkeepers.org',
        timezone: 'Asia/Taipei',
    },
    sos: {
        enabled: true,
        cooldownMinutes: 5,
        autoAcknowledgeMinutes: 30,
    },
    notifications: {
        pushEnabled: true,
        emailEnabled: true,
        lineEnabled: true,
        smsEnabled: false,
    },
    security: {
        sessionTimeoutMinutes: 60,
        maxLoginAttempts: 5,
        requireMfa: false,
    },
};

const SystemSettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'site' | 'sos' | 'notifications' | 'security'>('site');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/system/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setSettings(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/system/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (response.ok) {
                alert('設定已儲存');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
    };

    if (loading) {
        return <div className="settings-loading">載入中...</div>;
    }

    return (
        <div className="system-settings-page">
            <header className="settings-header">
                <h1>⚙️ 系統設定</h1>
                <button className="save-btn" onClick={saveSettings} disabled={saving}>
                    {saving ? '儲存中...' : '💾 儲存變更'}
                </button>
            </header>

            <div className="settings-tabs">
                <button
                    className={`tab ${activeTab === 'site' ? 'active' : ''}`}
                    onClick={() => setActiveTab('site')}
                >
                    🏠 網站設定
                </button>
                <button
                    className={`tab ${activeTab === 'sos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sos')}
                >
                    🚨 SOS 設定
                </button>
                <button
                    className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    🔔 通知設定
                </button>
                <button
                    className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    🔒 安全設定
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'site' && (
                    <div className="settings-section">
                        <h2>網站基本設定</h2>
                        <div className="form-group">
                            <label>網站名稱</label>
                            <input
                                type="text"
                                value={settings.site.name}
                                onChange={e => updateSetting('site', 'name', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>網站描述</label>
                            <textarea
                                value={settings.site.description}
                                onChange={e => updateSetting('site', 'description', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>聯絡信箱</label>
                            <input
                                type="email"
                                value={settings.site.contactEmail}
                                onChange={e => updateSetting('site', 'contactEmail', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>時區</label>
                            <select
                                value={settings.site.timezone}
                                onChange={e => updateSetting('site', 'timezone', e.target.value)}
                            >
                                <option value="Asia/Taipei">Asia/Taipei (UTC+8)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'sos' && (
                    <div className="settings-section">
                        <h2>SOS 緊急求救設定</h2>
                        <div className="form-group toggle-group">
                            <label>啟用 SOS 功能</label>
                            <input
                                type="checkbox"
                                checked={settings.sos.enabled}
                                onChange={e => updateSetting('sos', 'enabled', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>冷卻時間 (分鐘)</label>
                            <input
                                type="number"
                                value={settings.sos.cooldownMinutes}
                                onChange={e => updateSetting('sos', 'cooldownMinutes', Number(e.target.value))}
                                min="1"
                                max="60"
                            />
                            <small>同一用戶兩次 SOS 之間的最小間隔</small>
                        </div>
                        <div className="form-group">
                            <label>自動確認時間 (分鐘)</label>
                            <input
                                type="number"
                                value={settings.sos.autoAcknowledgeMinutes}
                                onChange={e => updateSetting('sos', 'autoAcknowledgeMinutes', Number(e.target.value))}
                                min="5"
                                max="120"
                            />
                            <small>無人處理時自動標記為已確認</small>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="settings-section">
                        <h2>通知管道設定</h2>
                        <div className="form-group toggle-group">
                            <label>推播通知</label>
                            <input
                                type="checkbox"
                                checked={settings.notifications.pushEnabled}
                                onChange={e => updateSetting('notifications', 'pushEnabled', e.target.checked)}
                            />
                        </div>
                        <div className="form-group toggle-group">
                            <label>電子郵件通知</label>
                            <input
                                type="checkbox"
                                checked={settings.notifications.emailEnabled}
                                onChange={e => updateSetting('notifications', 'emailEnabled', e.target.checked)}
                            />
                        </div>
                        <div className="form-group toggle-group">
                            <label>LINE 通知</label>
                            <input
                                type="checkbox"
                                checked={settings.notifications.lineEnabled}
                                onChange={e => updateSetting('notifications', 'lineEnabled', e.target.checked)}
                            />
                        </div>
                        <div className="form-group toggle-group">
                            <label>簡訊通知 (SMS)</label>
                            <input
                                type="checkbox"
                                checked={settings.notifications.smsEnabled}
                                onChange={e => updateSetting('notifications', 'smsEnabled', e.target.checked)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="settings-section">
                        <h2>安全設定</h2>
                        <div className="form-group">
                            <label>登入逾時 (分鐘)</label>
                            <input
                                type="number"
                                value={settings.security.sessionTimeoutMinutes}
                                onChange={e => updateSetting('security', 'sessionTimeoutMinutes', Number(e.target.value))}
                                min="15"
                                max="480"
                            />
                        </div>
                        <div className="form-group">
                            <label>最大登入嘗試次數</label>
                            <input
                                type="number"
                                value={settings.security.maxLoginAttempts}
                                onChange={e => updateSetting('security', 'maxLoginAttempts', Number(e.target.value))}
                                min="3"
                                max="10"
                            />
                        </div>
                        <div className="form-group toggle-group">
                            <label>強制雙因素驗證</label>
                            <input
                                type="checkbox"
                                checked={settings.security.requireMfa}
                                onChange={e => updateSetting('security', 'requireMfa', e.target.checked)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemSettingsPage;
