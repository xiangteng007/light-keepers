/**
 * PreferencesPanel Component
 * 
 * Notification and preference settings with toggles.
 */

import React, { useState } from 'react';
import {
    Bell,
    Mail,
    MessageCircle,
    Smartphone,
    BellRing,
    RotateCcw,
    Save,
} from 'lucide-react';
import type { PreferencesPanelProps, NotificationPreferences, NotificationChannel } from '../../account.types';
import { DEFAULT_NOTIFICATION_PREFS } from '../../account.mock';
import styles from './PreferencesPanel.module.css';

const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
    data,
    onSave,
    onReset,
}) => {
    const [prefs, setPrefs] = useState<NotificationPreferences>(data.notifications);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const handleChannelToggle = (
        category: keyof Pick<NotificationPreferences, 'systemAnnouncements' | 'taskAssignments' | 'emergencyAlerts'>,
        channel: keyof NotificationChannel
    ) => {
        setPrefs(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [channel]: !prev[category][channel],
            },
        }));
        setIsDirty(true);
    };

    const handleDigestToggle = () => {
        setPrefs(prev => ({
            ...prev,
            weeklyDigest: !prev.weeklyDigest,
        }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(prefs);
            setIsDirty(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPrefs(DEFAULT_NOTIFICATION_PREFS);
        setIsDirty(true);
        onReset();
    };

    const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
        <label className={styles.toggle}>
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className={styles.slider}></span>
        </label>
    );

    const NotificationRow: React.FC<{
        icon: React.ReactNode;
        title: string;
        description: string;
        category: keyof Pick<NotificationPreferences, 'systemAnnouncements' | 'taskAssignments' | 'emergencyAlerts'>;
    }> = ({ icon, title, description, category }) => (
        <div className={styles.notificationRow}>
            <div className={styles.notificationInfo}>
                <div className={styles.notificationIcon}>{icon}</div>
                <div>
                    <h4>{title}</h4>
                    <p>{description}</p>
                </div>
            </div>
            <div className={styles.channelToggles}>
                <div className={styles.channelItem} title="Email">
                    <Mail size={16} />
                    <ToggleSwitch
                        checked={prefs[category].email}
                        onChange={() => handleChannelToggle(category, 'email')}
                    />
                </div>
                <div className={styles.channelItem} title="簡訊">
                    <Smartphone size={16} />
                    <ToggleSwitch
                        checked={prefs[category].sms}
                        onChange={() => handleChannelToggle(category, 'sms')}
                    />
                </div>
                <div className={styles.channelItem} title="LINE">
                    <MessageCircle size={16} />
                    <ToggleSwitch
                        checked={prefs[category].line}
                        onChange={() => handleChannelToggle(category, 'line')}
                    />
                </div>
                <div className={styles.channelItem} title="推播">
                    <BellRing size={16} />
                    <ToggleSwitch
                        checked={prefs[category].push}
                        onChange={() => handleChannelToggle(category, 'push')}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.sectionTitle}>通知與偏好設定</h3>
                    <p className={styles.sectionDesc}>管理您接收通知的方式</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.resetBtn} onClick={handleReset}>
                        <RotateCcw size={16} />
                        恢復預設
                    </button>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </div>

            {/* Channel Legend */}
            <div className={styles.legend}>
                <span className={styles.legendItem}><Mail size={14} /> Email</span>
                <span className={styles.legendItem}><Smartphone size={14} /> 簡訊</span>
                <span className={styles.legendItem}><MessageCircle size={14} /> LINE</span>
                <span className={styles.legendItem}><BellRing size={14} /> 推播</span>
            </div>

            {/* Notification Categories */}
            <div className={styles.card}>
                <NotificationRow
                    icon={<Bell size={20} />}
                    title="系統公告"
                    description="平台更新、維護通知與重要公告"
                    category="systemAnnouncements"
                />

                <NotificationRow
                    icon={<Smartphone size={20} />}
                    title="任務指派"
                    description="被指派新任務或任務狀態變更時通知"
                    category="taskAssignments"
                />

                <NotificationRow
                    icon={<BellRing size={20} />}
                    title="緊急警報"
                    description="災情警報、緊急召集與即時示警"
                    category="emergencyAlerts"
                />
            </div>

            {/* Weekly Digest */}
            <div className={styles.card}>
                <div className={styles.digestRow}>
                    <div className={styles.notificationInfo}>
                        <div className={styles.notificationIcon}>
                            <Mail size={20} />
                        </div>
                        <div>
                            <h4>每週摘要</h4>
                            <p>每週一封郵件，彙整您的活動與平台動態</p>
                        </div>
                    </div>
                    <ToggleSwitch
                        checked={prefs.weeklyDigest}
                        onChange={handleDigestToggle}
                    />
                </div>
            </div>

            {/* Dirty State Warning */}
            {isDirty && (
                <div className={styles.dirtyWarning}>
                    您有未儲存的變更
                </div>
            )}
        </div>
    );
};

export default PreferencesPanel;
