/**
 * ProfilePanel Component
 * 
 * Profile tab content with read/edit mode, validation, and verification status.
 */

import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    Building2,
    Edit3,
    Save,
    X,
    CheckCircle,
    AlertCircle,
    Send,
} from 'lucide-react';
import type { ProfilePanelProps, ProfileFormData, ProfileFormErrors } from '../../account.types';
import styles from './ProfilePanel.module.css';

const ProfilePanel: React.FC<ProfilePanelProps> = ({
    data,
    onSave,
    onResendVerification,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResending, setIsResending] = useState<'email' | 'phone' | null>(null);
    const [formData, setFormData] = useState<ProfileFormData>({
        displayName: data.displayName || '',
        realName: data.realName || '',
        nickname: data.nickname || '',
        phone: data.phone || '',
    });
    const [errors, setErrors] = useState<ProfileFormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Reset form when data changes
    useEffect(() => {
        setFormData({
            displayName: data.displayName || '',
            realName: data.realName || '',
            nickname: data.nickname || '',
            phone: data.phone || '',
        });
    }, [data]);

    const validateForm = (): boolean => {
        const newErrors: ProfileFormErrors = {};

        if (!formData.displayName.trim()) {
            newErrors.displayName = '顯示名稱為必填';
        } else if (formData.displayName.length > 50) {
            newErrors.displayName = '顯示名稱不可超過 50 字';
        }

        if (formData.realName && formData.realName.length > 50) {
            newErrors.realName = '真實姓名不可超過 50 字';
        }

        if (formData.nickname && formData.nickname.length > 30) {
            newErrors.nickname = '暱稱不可超過 30 字';
        }

        if (formData.phone) {
            const phoneRegex = /^09\d{2}-?\d{3}-?\d{3}$/;
            if (!phoneRegex.test(formData.phone.replace(/-/g, ''))) {
                newErrors.phone = '請輸入有效的手機號碼格式';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof ProfileFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            await onSave(formData);
            setIsEditing(false);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            displayName: data.displayName || '',
            realName: data.realName || '',
            nickname: data.nickname || '',
            phone: data.phone || '',
        });
        setErrors({});
        setIsEditing(false);
        setIsDirty(false);
    };

    const handleResendVerification = async (type: 'email' | 'phone') => {
        setIsResending(type);
        try {
            await onResendVerification(type);
        } catch (error) {
            console.error(`Failed to resend ${type} verification:`, error);
        } finally {
            setIsResending(null);
        }
    };

    return (
        <div className={styles.panel}>
            {/* Section Header */}
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>個人資料</h3>
                {!isEditing ? (
                    <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                        <Edit3 size={16} />
                        <span>編輯資料</span>
                    </button>
                ) : (
                    <div className={styles.editActions}>
                        <button
                            className={styles.cancelBtn}
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            <X size={16} />
                            <span>取消</span>
                        </button>
                        <button
                            className={styles.saveBtn}
                            onClick={handleSave}
                            disabled={isSaving || !isDirty}
                        >
                            <Save size={16} />
                            <span>{isSaving ? '儲存中...' : '儲存變更'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Basic Information */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <User size={18} />
                    <span>基本資訊</span>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.formGrid}>
                        {/* Display Name */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                顯示名稱 <span className={styles.required}>*</span>
                            </label>
                            {isEditing ? (
                                <>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${errors.displayName ? styles.inputError : ''}`}
                                        value={formData.displayName}
                                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                                        placeholder="輸入您的顯示名稱"
                                    />
                                    {errors.displayName && (
                                        <span className={styles.errorText}>{errors.displayName}</span>
                                    )}
                                </>
                            ) : (
                                <div className={styles.valueBox}>
                                    {data.displayName || <span className={styles.empty}>未設定</span>}
                                </div>
                            )}
                        </div>

                        {/* Real Name */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>真實姓名</label>
                            {isEditing ? (
                                <>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${errors.realName ? styles.inputError : ''}`}
                                        value={formData.realName}
                                        onChange={(e) => handleInputChange('realName', e.target.value)}
                                        placeholder="輸入您的真實姓名"
                                    />
                                    {errors.realName && (
                                        <span className={styles.errorText}>{errors.realName}</span>
                                    )}
                                </>
                            ) : (
                                <div className={styles.valueBox}>
                                    {data.realName || <span className={styles.empty}>未設定</span>}
                                </div>
                            )}
                        </div>

                        {/* Nickname */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>暱稱 / 代號</label>
                            {isEditing ? (
                                <>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${errors.nickname ? styles.inputError : ''}`}
                                        value={formData.nickname}
                                        onChange={(e) => handleInputChange('nickname', e.target.value)}
                                        placeholder="輸入您的暱稱或代號"
                                    />
                                    {errors.nickname && (
                                        <span className={styles.errorText}>{errors.nickname}</span>
                                    )}
                                </>
                            ) : (
                                <div className={styles.valueBox}>
                                    {data.nickname || <span className={styles.empty}>未設定</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <Mail size={18} />
                    <span>聯絡資訊</span>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.formGrid}>
                        {/* Email */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>電子郵件</label>
                            <div className={styles.valueBoxWithAction}>
                                <div className={styles.valueContent}>
                                    <span>{data.email}</span>
                                    {data.emailVerified ? (
                                        <span className={styles.verifiedBadge}>
                                            <CheckCircle size={14} />
                                            已驗證
                                        </span>
                                    ) : (
                                        <span className={styles.unverifiedBadge}>
                                            <AlertCircle size={14} />
                                            未驗證
                                        </span>
                                    )}
                                </div>
                                {!data.emailVerified && (
                                    <button
                                        className={styles.resendBtn}
                                        onClick={() => handleResendVerification('email')}
                                        disabled={isResending === 'email'}
                                    >
                                        <Send size={14} />
                                        {isResending === 'email' ? '發送中...' : '重寄驗證信'}
                                    </button>
                                )}
                            </div>
                            <span className={styles.hint}>
                                如需變更電子郵件，請聯繫管理員
                            </span>
                        </div>

                        {/* Phone */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>手機號碼</label>
                            {isEditing ? (
                                <>
                                    <input
                                        type="tel"
                                        className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        placeholder="0912-345-678"
                                    />
                                    {errors.phone && (
                                        <span className={styles.errorText}>{errors.phone}</span>
                                    )}
                                </>
                            ) : (
                                <div className={styles.valueBoxWithAction}>
                                    <div className={styles.valueContent}>
                                        <span>{data.phone || <span className={styles.empty}>未設定</span>}</span>
                                        {data.phone && (
                                            data.phoneVerified ? (
                                                <span className={styles.verifiedBadge}>
                                                    <CheckCircle size={14} />
                                                    已驗證
                                                </span>
                                            ) : (
                                                <span className={styles.unverifiedBadge}>
                                                    <AlertCircle size={14} />
                                                    未驗證
                                                </span>
                                            )
                                        )}
                                    </div>
                                    {data.phone && !data.phoneVerified && (
                                        <button
                                            className={styles.resendBtn}
                                            onClick={() => handleResendVerification('phone')}
                                            disabled={isResending === 'phone'}
                                        >
                                            <Send size={14} />
                                            {isResending === 'phone' ? '發送中...' : '發送驗證碼'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Organization Info (Read-only) */}
            {data.organizations.length > 0 && (
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <Building2 size={18} />
                        <span>所屬單位</span>
                    </div>
                    <div className={styles.cardContent}>
                        {data.organizations.map((org) => (
                            <div key={org.id} className={styles.orgItem}>
                                <div className={styles.orgInfo}>
                                    <span className={styles.orgName}>{org.name}</span>
                                    {org.isPrimary && (
                                        <span className={styles.primaryBadge}>主要單位</span>
                                    )}
                                </div>
                                <div className={styles.orgMeta}>
                                    {org.department && <span>{org.department}</span>}
                                    {org.role && <span> • {org.role}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePanel;
