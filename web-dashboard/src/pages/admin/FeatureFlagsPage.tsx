/**
 * Feature Flags Management Page
 * Admin page for managing feature flags and A/B testing
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import './FeatureFlagsPage.css';

interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    rolloutPercentage: number;
    allowedRoles?: string[];
    allowedUsers?: string[];
    blockedUsers?: string[];
    variants?: Array<{ name: string; weight: number; config?: Record<string, any> }>;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

const FeatureFlagsPage: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
    const [formData, setFormData] = useState({
        key: '',
        name: '',
        description: '',
        enabled: true,
        rolloutPercentage: 100,
        allowedRoles: '',
    });

    useEffect(() => {
        loadFlags();
    }, []);

    const loadFlags = async () => {
        try {
            const { data } = await api.get('/features');
            setFlags(data.data || []);
        } catch (error) {
            console.error('Failed to load feature flags:', getApiErrorMessage(error, '載入功能旗標失敗'));
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingFlag(null);
        setFormData({
            key: '',
            name: '',
            description: '',
            enabled: true,
            rolloutPercentage: 100,
            allowedRoles: '',
        });
        setShowModal(true);
    };

    const openEditModal = (flag: FeatureFlag) => {
        setEditingFlag(flag);
        setFormData({
            key: flag.key,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
            rolloutPercentage: flag.rolloutPercentage,
            allowedRoles: flag.allowedRoles?.join(', ') || '',
        });
        setShowModal(true);
    };

    const saveFlag = async () => {
        const payload = {
            ...formData,
            allowedRoles: formData.allowedRoles ? formData.allowedRoles.split(',').map(s => s.trim()) : [],
        };

        const url = editingFlag ? `/features/${editingFlag.key}` : '/features';

        try {
            if (editingFlag) {
                await api.put(url, payload);
            } else {
                await api.post(url, payload);
            }
            setShowModal(false);
            loadFlags();
        } catch (error) {
            console.error('Failed to save feature flag:', getApiErrorMessage(error, '儲存功能旗標失敗'));
        }
    };

    const deleteFlag = async (key: string) => {
        if (!confirm('確定要刪除此功能旗標？')) return;

        try {
            await api.delete(`/features/${key}`);
            loadFlags();
        } catch (error) {
            console.error('Failed to delete feature flag:', getApiErrorMessage(error, '刪除功能旗標失敗'));
        }
    };

    const toggleFlag = async (flag: FeatureFlag) => {
        try {
            await api.put(`/features/${flag.key}`, { ...flag, enabled: !flag.enabled });
            loadFlags();
        } catch (error) {
            console.error('Failed to toggle feature flag:', getApiErrorMessage(error, '切換功能旗標失敗'));
        }
    };

    if (loading) {
        return <div className="flags-loading">載入中...</div>;
    }

    return (
        <div className="feature-flags-page">
            <header className="flags-header">
                <div>
                    <h1>🚩 Feature Flags</h1>
                    <p>管理功能開關與 A/B 測試</p>
                </div>
                <button className="create-btn" onClick={openCreateModal}>
                    ➕ 新增旗標
                </button>
            </header>

            <div className="flags-list">
                {flags.length === 0 ? (
                    <div className="empty-state">
                        <p>尚未設定任何功能旗標</p>
                        <button onClick={openCreateModal}>建立第一個旗標</button>
                    </div>
                ) : (
                    flags.map(flag => (
                        <div key={flag.id} className={`flag-card ${flag.enabled ? 'enabled' : 'disabled'}`}>
                            <div className="flag-toggle">
                                <button
                                    className={`toggle-btn ${flag.enabled ? 'on' : 'off'}`}
                                    onClick={() => toggleFlag(flag)}
                                >
                                    {flag.enabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            <div className="flag-info">
                                <h3>{flag.name}</h3>
                                <code className="flag-key">{flag.key}</code>
                                <p className="flag-description">{flag.description}</p>
                                <div className="flag-meta">
                                    <span className="rollout">
                                        📊 {flag.rolloutPercentage}% 發布
                                    </span>
                                    {flag.allowedRoles && flag.allowedRoles.length > 0 && (
                                        <span className="roles">
                                            👥 {flag.allowedRoles.join(', ')}
                                        </span>
                                    )}
                                    {flag.variants && flag.variants.length > 0 && (
                                        <span className="variants">
                                            🧪 {flag.variants.length} 變體
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flag-actions">
                                <button className="action-btn edit" onClick={() => openEditModal(flag)}>
                                    ✏️ 編輯
                                </button>
                                <button className="action-btn delete" onClick={() => deleteFlag(flag.key)}>
                                    🗑️ 刪除
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingFlag ? '編輯旗標' : '新增旗標'}</h2>

                        <div className="form-group">
                            <label>Key (唯一識別碼)</label>
                            <input
                                type="text"
                                value={formData.key}
                                onChange={e => setFormData(prev => ({ ...prev, key: e.target.value }))}
                                placeholder="例如：new-dashboard"
                                disabled={!!editingFlag}
                            />
                        </div>

                        <div className="form-group">
                            <label>名稱</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="例如：新版儀表板"
                            />
                        </div>

                        <div className="form-group">
                            <label>描述</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="功能說明"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>發布百分比</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={formData.rolloutPercentage}
                                    onChange={e => setFormData(prev => ({ ...prev, rolloutPercentage: Number(e.target.value) }))}
                                />
                                <span className="range-value">{formData.rolloutPercentage}%</span>
                            </div>

                            <div className="form-group toggle-inline">
                                <label>啟用</label>
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>允許角色 (逗號分隔)</label>
                            <input
                                type="text"
                                value={formData.allowedRoles}
                                onChange={e => setFormData(prev => ({ ...prev, allowedRoles: e.target.value }))}
                                placeholder="例如：admin, volunteer"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>
                                取消
                            </button>
                            <button className="save-btn" onClick={saveFlag}>
                                儲存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeatureFlagsPage;
