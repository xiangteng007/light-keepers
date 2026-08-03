/**
 * widgets/settings/SettingsWidgets.tsx
 *
 * System settings, backup management and user profile widgets.
 */
import { useState } from 'react';
import { Settings, Activity, Shield, Zap } from 'lucide-react';

export const SettingsNavWidget = () => {
    const [active, setActive] = useState('general');
    return (
        <div style={{ height: '100%', padding: '8px' }}>
            {[
                { id: 'general', icon: <Settings size={16} />, label: '一般設定' },
                { id: 'notifications', icon: <Activity size={16} />, label: '通知設定' },
                { id: 'security', icon: <Shield size={16} />, label: '安全設定' },
                { id: 'integrations', icon: <Zap size={16} />, label: '整合服務' },
            ].map((item) => (
                <div
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        background: active === item.id ? 'rgba(195, 155, 111, 0.15)' : 'transparent',
                        border: active === item.id ? '1px solid rgba(195, 155, 111, 0.3)' : '1px solid transparent',
                        color: active === item.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    }}
                >
                    {item.icon}
                    <span style={{ fontSize: '13px' }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export const SettingsPanelWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: 'var(--accent-gold)' }}>一般設定</h3>
        {[
            { label: '系統語言', desc: '介面顯示語言', type: 'select', value: '繁體中文' },
            { label: '深色模式', desc: '啟用深色介面主題', type: 'toggle', value: true },
            { label: '自動儲存', desc: '編輯時自動儲存變更', type: 'toggle', value: true },
        ].map((setting, i) => (
            <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
            }}>
                <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{setting.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{setting.desc}</div>
                </div>
                {setting.type === 'toggle' ? (
                    <div style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        background: setting.value ? 'rgba(34, 197, 94, 0.3)' : 'rgba(47, 54, 65, 0.5)',
                        border: setting.value ? '1px solid #22c55e' : '1px solid rgba(195, 155, 111, 0.2)',
                        position: 'relative',
                        cursor: 'pointer',
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: setting.value ? '22px' : '2px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: setting.value ? '#22c55e' : '#94A3B8',
                            transition: 'left 0.2s',
                        }} />
                    </div>
                ) : (
                    <select style={{
                        padding: '8px 12px',
                        background: 'rgba(47, 54, 65, 0.5)',
                        border: '1px solid rgba(195, 155, 111, 0.2)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                    }}>
                        <option>{setting.value}</option>
                    </select>
                )}
            </div>
        ))}
    </div>
);

export const BackupStatusWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>✓</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>上次備份成功</div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
            <div className="u-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>2h 前</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>最近備份時間</div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
            <div className="u-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>45.2 GB</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>總備份大小</div>
        </div>
    </div>
);

export const BackupListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
        {[
            { name: 'backup_2026-01-12_10-00', size: '5.2 GB', status: 'complete' },
            { name: 'backup_2026-01-11_22-00', size: '5.1 GB', status: 'complete' },
            { name: 'backup_2026-01-11_10-00', size: '5.0 GB', status: 'complete' },
        ].map((backup, i) => (
            <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
            }}>
                <div style={{ fontSize: '16px', marginRight: '12px' }}>💾</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{backup.name}</div>
                    <div className="u-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{backup.size}</div>
                </div>
                <button style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '6px', color: '#3B82F6', fontSize: '11px', cursor: 'pointer' }}>還原</button>
            </div>
        ))}
    </div>
);

export const BackupActionsWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <button style={{ width: '100%', padding: '12px', background: 'rgba(195, 155, 111, 0.9)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer', marginBottom: '12px' }}>立即備份</button>
        <button style={{ width: '100%', padding: '12px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>排程設定</button>
        <div style={{ padding: '12px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>自動備份</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>每 12 小時</span>
                <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '10px' }}>已啟用</span>
            </div>
        </div>
    </div>
);

export const ProfileCardWidget = () => (
    <div style={{ height: '100%', padding: '16px', textAlign: 'center' }}>
        <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(195, 155, 111, 0.2)', border: '3px solid var(--accent-gold)',
            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', color: 'var(--accent-gold)',
        }}>👤</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>使用者名稱</div>
        <div style={{ fontSize: '12px', color: 'var(--accent-gold)', marginBottom: '16px' }}>系統擁有者</div>
        <div style={{ padding: '12px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '8px', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📧 電子郵件</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>user@example.com</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📱 電話</div>
            <div className="u-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>0912-345-678</div>
        </div>
    </div>
);

export const ProfileSettingsWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px', fontWeight: 600 }}>帳戶設定</div>
        {['顯示名稱', '電子郵件', '電話號碼'].map((field, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{field}</label>
                <input type="text" style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.2)', borderRadius: '6px', color: 'var(--text-primary)' }} />
            </div>
        ))}
        <button style={{ padding: '10px 20px', background: 'rgba(195, 155, 111, 0.9)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>儲存變更</button>
    </div>
);

export const ProfileActivityWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>活動記錄</div>
        {['登入系統', '更新個人資料', '完成任務 #1023', '查看報表'].map((activity, i) => (
            <div key={i} style={{
                padding: '10px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                marginBottom: '6px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
            }}>
                <span>{activity}</span>
                <span className="u-mono" style={{ color: 'var(--text-muted)' }}>{i === 0 ? '剛剛' : `${i * 2}h 前`}</span>
            </div>
        ))}
    </div>
);
