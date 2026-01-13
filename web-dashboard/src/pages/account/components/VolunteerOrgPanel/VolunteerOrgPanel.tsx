/**
 * VolunteerOrgPanel Component
 * 
 * Volunteer organization info and badges wall.
 */

import React, { useState } from 'react';
import {
    Building2,
    Award,
    GraduationCap,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    Filter,
} from 'lucide-react';
import type { VolunteerOrgPanelProps, Badge, Certification } from '../../account.types';
import styles from './VolunteerOrgPanel.module.css';

type BadgeFilter = 'all' | 'earned' | 'pending';
type BadgeSort = 'date' | 'category' | 'name';

const VolunteerOrgPanel: React.FC<VolunteerOrgPanelProps> = ({ data }) => {
    const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
    const [badgeSort, setBadgeSort] = useState<BadgeSort>('date');

    const categoryLabels: Record<string, string> = {
        skill: '技能',
        achievement: '成就',
        service: '服務',
        training: '培訓',
    };

    const categoryColors: Record<string, string> = {
        skill: '#3B82F6',
        achievement: '#F59E0B',
        service: '#10B981',
        training: '#8B5CF6',
    };

    const filteredBadges = data.badges.filter(badge => {
        if (badgeFilter === 'earned') return badge.isEarned;
        if (badgeFilter === 'pending') return !badge.isEarned;
        return true;
    });

    const sortedBadges = [...filteredBadges].sort((a, b) => {
        if (badgeSort === 'date') {
            if (!a.earnedAt && !b.earnedAt) return 0;
            if (!a.earnedAt) return 1;
            if (!b.earnedAt) return -1;
            return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
        }
        if (badgeSort === 'category') {
            return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
    });

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getCertStatus = (cert: Certification) => {
        if (cert.status === 'expired') {
            return { label: '已過期', className: styles.statusExpired };
        }
        if (cert.status === 'pending') {
            return { label: '審核中', className: styles.statusPending };
        }
        return { label: '有效', className: styles.statusValid };
    };

    return (
        <div className={styles.panel}>
            <h3 className={styles.sectionTitle}>志工與組織</h3>

            {/* Organizations */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <Building2 size={18} />
                    <span>所屬單位</span>
                </div>
                <div className={styles.cardContent}>
                    {data.organizations.length > 0 ? (
                        <div className={styles.orgList}>
                            {data.organizations.map((org) => (
                                <div key={org.id} className={`${styles.orgItem} ${org.isPrimary ? styles.primaryOrg : ''}`}>
                                    <div className={styles.orgMain}>
                                        <h4>{org.name}</h4>
                                        {org.isPrimary && (
                                            <span className={styles.primaryBadge}>主要單位</span>
                                        )}
                                    </div>
                                    <div className={styles.orgMeta}>
                                        {org.department && <span>{org.department}</span>}
                                        {org.role && <span>{org.role}</span>}
                                        <span className={styles.orgDate}>
                                            <Calendar size={12} />
                                            {formatDate(org.joinedAt)} 加入
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Building2 size={32} />
                            <p>尚未加入任何單位</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Certifications */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <GraduationCap size={18} />
                    <span>證照與培訓</span>
                </div>
                <div className={styles.cardContent}>
                    {data.certifications.length > 0 ? (
                        <div className={styles.certList}>
                            {data.certifications.map((cert) => {
                                const status = getCertStatus(cert);
                                return (
                                    <div key={cert.id} className={styles.certItem}>
                                        <div className={styles.certMain}>
                                            <h4>{cert.name}</h4>
                                            <span className={`${styles.certStatus} ${status.className}`}>
                                                {cert.status === 'valid' && <CheckCircle size={12} />}
                                                {cert.status === 'expired' && <AlertCircle size={12} />}
                                                {cert.status === 'pending' && <Clock size={12} />}
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className={styles.certMeta}>
                                            <span>發證單位：{cert.issuer}</span>
                                            <span>
                                                <Calendar size={12} />
                                                {formatDate(cert.issuedAt)}
                                                {cert.expiresAt && ` ~ ${formatDate(cert.expiresAt)}`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <GraduationCap size={32} />
                            <p>尚無證照記錄</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Badges Wall */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <Award size={18} />
                    <span>志工徽章</span>
                    <span className={styles.badgeCount}>
                        {data.badges.filter(b => b.isEarned).length} / {data.badges.length}
                    </span>
                </div>

                {/* Filters */}
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <Filter size={14} />
                        <button
                            className={`${styles.filterBtn} ${badgeFilter === 'all' ? styles.active : ''}`}
                            onClick={() => setBadgeFilter('all')}
                        >
                            全部
                        </button>
                        <button
                            className={`${styles.filterBtn} ${badgeFilter === 'earned' ? styles.active : ''}`}
                            onClick={() => setBadgeFilter('earned')}
                        >
                            已獲得
                        </button>
                        <button
                            className={`${styles.filterBtn} ${badgeFilter === 'pending' ? styles.active : ''}`}
                            onClick={() => setBadgeFilter('pending')}
                        >
                            未獲得
                        </button>
                    </div>
                    <select
                        className={styles.sortSelect}
                        value={badgeSort}
                        onChange={(e) => setBadgeSort(e.target.value as BadgeSort)}
                    >
                        <option value="date">依日期排序</option>
                        <option value="category">依類別排序</option>
                        <option value="name">依名稱排序</option>
                    </select>
                </div>

                <div className={styles.badgesGrid}>
                    {sortedBadges.map((badge) => (
                        <div
                            key={badge.id}
                            className={`${styles.badgeCard} ${badge.isEarned ? styles.earned : styles.locked}`}
                        >
                            <div
                                className={styles.badgeIcon}
                                style={{
                                    background: badge.isEarned
                                        ? `${categoryColors[badge.category]}20`
                                        : 'rgba(255,255,255,0.05)',
                                    color: badge.isEarned
                                        ? categoryColors[badge.category]
                                        : 'var(--account-text-muted)',
                                }}
                            >
                                <Award size={24} />
                            </div>
                            <div className={styles.badgeInfo}>
                                <h5>{badge.name}</h5>
                                <span
                                    className={styles.badgeCategory}
                                    style={{ color: categoryColors[badge.category] }}
                                >
                                    {categoryLabels[badge.category]}
                                </span>
                                <p className={styles.badgeDesc}>{badge.description}</p>
                                {badge.isEarned && badge.earnedAt && (
                                    <span className={styles.badgeDate}>
                                        <CheckCircle size={12} />
                                        {formatDate(badge.earnedAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {sortedBadges.length === 0 && (
                    <div className={styles.emptyState}>
                        <Award size={32} />
                        <p>沒有符合條件的徽章</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VolunteerOrgPanel;
