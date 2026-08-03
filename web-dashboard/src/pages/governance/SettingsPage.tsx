/**
 * SettingsPage.tsx
 *
 * 系統設定頁面（Detail archetype — 分段 Panel 呈現目前生效的系統設定）
 */
// 保留 lucide（R5/T6 誠實清單）：Globe（語言/國際化）、Smartphone（PWA 裝置）
import { Globe, Smartphone } from 'lucide-react';
import { ThemeIcon, NotifyIcon, type LkIcon } from '../../design-system/icons';
import { Badge } from '../../design-system';
import './SettingsPage.css';

interface SettingRow {
    icon: typeof Globe | LkIcon;
    label: string;
    value: string;
    status?: 'success';
}

const SETTINGS_ROWS: SettingRow[] = [
    { icon: Globe, label: '語言設定', value: '繁體中文 (zh-TW)' },
    { icon: ThemeIcon, label: '主題模式', value: '深色模式 (Dark Mode)' },
    { icon: NotifyIcon, label: '通知設定', value: '已啟用', status: 'success' },
    { icon: Smartphone, label: 'PWA 設定', value: '已安裝為獨立應用', status: 'success' },
];

export default function SettingsPage() {
    return (
        <div className="settings-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h1 className="settings-page__title">系統設定</h1>
                    <p className="page-subtitle">系統參數、環境配置、整合設定</p>
                </div>
            </div>

            <section className="panel settings-page__panel" aria-labelledby="settings-general-heading">
                <h2 id="settings-general-heading" className="settings-page__panel-title">一般設定</h2>
                <div className="settings-page__list">
                    {SETTINGS_ROWS.map((row) => {
                        const Icon = row.icon;
                        return (
                            <div className="settings-page__row" key={row.label}>
                                <div className="settings-page__row-label">
                                    <Icon size={18} aria-hidden="true" className="settings-page__row-icon" />
                                    <span>{row.label}</span>
                                </div>
                                <div className="settings-page__row-value">
                                    {row.status === 'success' ? (
                                        <Badge variant="success" size="sm">{row.value}</Badge>
                                    ) : (
                                        <span>{row.value}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
