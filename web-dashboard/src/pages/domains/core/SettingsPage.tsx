import { useState } from 'react';
import { Button, InputField } from '../../../design-system';
import './SettingsPage.css';

interface SettingSection {
    id: 'profile' | 'notifications' | 'security' | 'display';
    title: string;
    description: string;
}

const sections: SettingSection[] = [
    { id: 'profile', title: '個人資料', description: '管理您的基本資訊' },
    { id: 'notifications', title: '通知設定', description: '設定提醒偏好' },
    { id: 'security', title: '安全性', description: '密碼與登入設定' },
    { id: 'display', title: '顯示', description: '主題與版面偏好' },
];

const NOTIFICATION_LABEL: Record<string, string> = {
    email: '電子郵件通知',
    push: '推播通知',
    sms: '簡訊通知',
};

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState<SettingSection['id']>('profile');
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState({ email: true, push: true, sms: false });

    return (
        <div className="settings-page">
            <header className="settings-page__header">
                <h1>設定</h1>
                <p className="settings-page__subtitle">管理您的偏好設定</p>
            </header>

            <div className="settings-page__body">
                <nav className="settings-nav" aria-label="設定類別">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className={`settings-nav__item ${activeSection === section.id ? 'settings-nav__item--active' : ''}`}
                            aria-current={activeSection === section.id ? 'page' : undefined}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <span className="settings-nav__title">{section.title}</span>
                            <span className="settings-nav__desc">{section.description}</span>
                        </button>
                    ))}
                </nav>

                <section className="settings-content" aria-live="polite">
                    {activeSection === 'profile' && (
                        <div className="settings-section">
                            <h2>個人資料</h2>
                            <div className="settings-grid">
                                <InputField label="顯示名稱" defaultValue="Admin User" fullWidth />
                                <InputField label="電子郵件" type="email" defaultValue="admin@lightkeepers.org" fullWidth />
                                <InputField label="電話" type="tel" defaultValue="+886 912 345 678" fullWidth />
                                <InputField label="區域" defaultValue="North District" fullWidth />
                            </div>
                            <Button>儲存變更</Button>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="settings-section">
                            <h2>通知偏好</h2>
                            <div className="settings-toggle-list">
                                {(Object.entries(notifications) as [keyof typeof notifications, boolean][]).map(([key, value]) => (
                                    <label key={key} className="settings-toggle">
                                        <span>{NOTIFICATION_LABEL[key]}</span>
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={() => setNotifications({ ...notifications, [key]: !value })}
                                            aria-label={NOTIFICATION_LABEL[key]}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="settings-section">
                            <h2>安全性設定</h2>
                            <div className="settings-grid settings-grid--single">
                                <InputField label="目前密碼" type="password" fullWidth />
                                <InputField label="新密碼" type="password" fullWidth />
                                <InputField label="確認新密碼" type="password" fullWidth />
                            </div>
                            <Button>更新密碼</Button>
                        </div>
                    )}

                    {activeSection === 'display' && (
                        <div className="settings-section">
                            <h2>顯示設定</h2>
                            <div className="settings-theme">
                                <span className="settings-theme__label">主題</span>
                                <div className="settings-theme__options" role="group" aria-label="主題選擇">
                                    <Button
                                        variant={theme === 'dark' ? 'primary' : 'secondary'}
                                        aria-pressed={theme === 'dark'}
                                        onClick={() => setTheme('dark')}
                                    >
                                        深色
                                    </Button>
                                    <Button
                                        variant={theme === 'light' ? 'primary' : 'secondary'}
                                        aria-pressed={theme === 'light'}
                                        onClick={() => setTheme('light')}
                                    >
                                        淺色
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
