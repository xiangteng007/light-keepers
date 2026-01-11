/**
 * SettingsPage.tsx
 * 
 * 系統設定頁面 - Core Domain
 * 功能：全域配置、通知設定、整合設定
 */
import { useState } from 'react';
import { Settings, Bell, Shield, Globe, Database, Zap, Save, RefreshCw } from 'lucide-react';
import './SettingsPage.css';

type SettingCategory = 'general' | 'notifications' | 'security' | 'integrations';

interface SettingItem {
    id: string;
    label: string;
    description: string;
    type: 'toggle' | 'select' | 'input';
    value: boolean | string;
    options?: string[];
}

const SETTINGS: Record<SettingCategory, SettingItem[]> = {
    general: [
        { id: 'language', label: '系統語言', description: '介面顯示語言', type: 'select', value: '繁體中文', options: ['繁體中文', 'English', '日本語'] },
        { id: 'timezone', label: '時區設定', description: '系統時間基準', type: 'select', value: 'Asia/Taipei', options: ['Asia/Taipei', 'Asia/Tokyo', 'UTC'] },
        { id: 'darkMode', label: '深色模式', description: '啟用深色介面主題', type: 'toggle', value: true },
        { id: 'autoSave', label: '自動儲存', description: '編輯時自動儲存變更', type: 'toggle', value: true },
    ],
    notifications: [
        { id: 'emailNotify', label: '電子郵件通知', description: '重要事件透過 Email 通知', type: 'toggle', value: true },
        { id: 'pushNotify', label: '推播通知', description: '行動裝置推播通知', type: 'toggle', value: true },
        { id: 'lineNotify', label: 'LINE 通知', description: '透過 LINE Notify 發送通知', type: 'toggle', value: false },
        { id: 'alertLevel', label: '警報等級', description: '接收通知的最低嚴重程度', type: 'select', value: '中', options: ['低', '中', '高', '緊急'] },
    ],
    security: [
        { id: '2fa', label: '雙因素認證', description: '強制所有用戶啟用 2FA', type: 'toggle', value: true },
        { id: 'sessionTimeout', label: '會話逾時 (分鐘)', description: '閒置自動登出時間', type: 'input', value: '30' },
        { id: 'ipWhitelist', label: 'IP 白名單', description: '限制特定 IP 存取', type: 'toggle', value: false },
        { id: 'auditLog', label: '審計日誌', description: '記錄所有系統操作', type: 'toggle', value: true },
    ],
    integrations: [
        { id: 'ncdr', label: 'NCDR 警報整合', description: '接收國家災害通報', type: 'toggle', value: true },
        { id: 'cwb', label: '中央氣象署整合', description: '自動同步氣象資料', type: 'toggle', value: true },
        { id: 'mapbox', label: 'Mapbox 地圖', description: '使用 Mapbox 地圖服務', type: 'toggle', value: true },
        { id: 'ai', label: 'AI 分析服務', description: '啟用 AI 輔助分析功能', type: 'toggle', value: true },
    ],
};

const CATEGORY_ICONS: Record<SettingCategory, any> = {
    general: Globe,
    notifications: Bell,
    security: Shield,
    integrations: Zap,
};

export default function SettingsPage() {
    const [activeCategory, setActiveCategory] = useState<SettingCategory>('general');
    const [settings, setSettings] = useState(SETTINGS);
    const [hasChanges, setHasChanges] = useState(false);

    const toggleSetting = (category: SettingCategory, id: string) => {
        setSettings(prev => ({
            ...prev,
            [category]: prev[category].map(item =>
                item.id === id ? { ...item, value: !item.value } : item
            )
        }));
        setHasChanges(true);
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div className="header-title">
                    <Settings size={24} />
                    <div>
                        <h1>系統設定</h1>
                        <p>管理平台全域配置</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-reset" disabled={!hasChanges}>
                        <RefreshCw size={16} />
                        重設
                    </button>
                    <button className="btn-save" disabled={!hasChanges}>
                        <Save size={16} />
                        儲存變更
                    </button>
                </div>
            </header>

            <div className="settings-content">
                <nav className="settings-nav">
                    {(Object.keys(SETTINGS) as SettingCategory[]).map(category => {
                        const Icon = CATEGORY_ICONS[category];
                        return (
                            <button
                                key={category}
                                className={`nav-item ${activeCategory === category ? 'active' : ''}`}
                                onClick={() => setActiveCategory(category)}
                            >
                                <Icon size={18} />
                                <span>
                                    {category === 'general' && '一般設定'}
                                    {category === 'notifications' && '通知設定'}
                                    {category === 'security' && '安全設定'}
                                    {category === 'integrations' && '整合服務'}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="settings-panel">
                    <h2>
                        {activeCategory === 'general' && '一般設定'}
                        {activeCategory === 'notifications' && '通知設定'}
                        {activeCategory === 'security' && '安全設定'}
                        {activeCategory === 'integrations' && '整合服務'}
                    </h2>
                    <div className="settings-list">
                        {settings[activeCategory].map(item => (
                            <div key={item.id} className="setting-item">
                                <div className="setting-info">
                                    <label>{item.label}</label>
                                    <p>{item.description}</p>
                                </div>
                                <div className="setting-control">
                                    {item.type === 'toggle' && (
                                        <button
                                            className={`toggle ${item.value ? 'on' : 'off'}`}
                                            onClick={() => toggleSetting(activeCategory, item.id)}
                                        >
                                            <span className="toggle-knob" />
                                        </button>
                                    )}
                                    {item.type === 'select' && (
                                        <select value={item.value as string}>
                                            {item.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}
                                    {item.type === 'input' && (
                                        <input type="text" value={item.value as string} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
