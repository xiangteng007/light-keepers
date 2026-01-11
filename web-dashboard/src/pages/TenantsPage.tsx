/**
 * TenantsPage.tsx
 * 
 * 租戶管理頁面 - Core Domain
 * 功能：多組織管理、租戶配額、隔離設定
 */
import { useState } from 'react';
import { Building, Plus, Settings, Users, Database, Activity, ChevronRight } from 'lucide-react';
import './TenantsPage.css';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: 'free' | 'pro' | 'enterprise';
    users: number;
    maxUsers: number;
    storage: number;
    maxStorage: number;
    status: 'active' | 'suspended' | 'trial';
    createdAt: string;
}

const MOCK_TENANTS: Tenant[] = [
    { id: 'T-001', name: '光守護者總會', slug: 'lightkeepers-hq', plan: 'enterprise', users: 150, maxUsers: 500, storage: 45, maxStorage: 100, status: 'active', createdAt: '2024-01-01' },
    { id: 'T-002', name: '台北市救災協會', slug: 'taipei-rescue', plan: 'pro', users: 45, maxUsers: 100, storage: 12, maxStorage: 50, status: 'active', createdAt: '2024-06-15' },
    { id: 'T-003', name: '新北市志工團', slug: 'newtaipei-vol', plan: 'pro', users: 30, maxUsers: 100, storage: 8, maxStorage: 50, status: 'active', createdAt: '2024-08-01' },
    { id: 'T-004', name: '測試組織', slug: 'test-org', plan: 'free', users: 5, maxUsers: 10, storage: 1, maxStorage: 5, status: 'trial', createdAt: '2026-01-05' },
];

const PLAN_COLORS: Record<string, string> = {
    enterprise: '#A855F7',
    pro: '#3B82F6',
    free: '#94A3B8'
};

export default function TenantsPage() {
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

    return (
        <div className="tenants-page">
            <header className="tenants-header">
                <div className="header-title">
                    <Building size={24} />
                    <div>
                        <h1>租戶管理</h1>
                        <p>管理多組織設定與資源配額</p>
                    </div>
                </div>
                <button className="btn-add-tenant">
                    <Plus size={16} />
                    新增租戶
                </button>
            </header>

            <div className="tenants-content">
                <div className="tenants-list">
                    {MOCK_TENANTS.map(tenant => (
                        <div
                            key={tenant.id}
                            className={`tenant-card ${selectedTenant?.id === tenant.id ? 'selected' : ''}`}
                            onClick={() => setSelectedTenant(tenant)}
                        >
                            <div className="tenant-info">
                                <div className="tenant-icon" style={{ borderColor: PLAN_COLORS[tenant.plan] }}>
                                    <Building size={20} />
                                </div>
                                <div>
                                    <h3>{tenant.name}</h3>
                                    <span className="slug">/{tenant.slug}</span>
                                </div>
                            </div>
                            <span className="plan-badge" style={{ background: `${PLAN_COLORS[tenant.plan]}20`, color: PLAN_COLORS[tenant.plan] }}>
                                {tenant.plan.toUpperCase()}
                            </span>
                            <ChevronRight size={16} className="chevron" />
                        </div>
                    ))}
                </div>

                <div className="tenant-detail">
                    {selectedTenant ? (
                        <>
                            <div className="detail-header">
                                <h2>{selectedTenant.name}</h2>
                                <span className={`status-badge ${selectedTenant.status}`}>
                                    {selectedTenant.status}
                                </span>
                            </div>

                            <div className="quotas-grid">
                                <div className="quota-card">
                                    <Users size={20} />
                                    <div className="quota-info">
                                        <span className="quota-label">用戶數</span>
                                        <span className="quota-value">{selectedTenant.users} / {selectedTenant.maxUsers}</span>
                                    </div>
                                    <div className="quota-bar">
                                        <div className="quota-fill" style={{ width: `${(selectedTenant.users / selectedTenant.maxUsers) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="quota-card">
                                    <Database size={20} />
                                    <div className="quota-info">
                                        <span className="quota-label">儲存空間</span>
                                        <span className="quota-value">{selectedTenant.storage} / {selectedTenant.maxStorage} GB</span>
                                    </div>
                                    <div className="quota-bar">
                                        <div className="quota-fill" style={{ width: `${(selectedTenant.storage / selectedTenant.maxStorage) * 100}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="tenant-actions">
                                <button className="action-btn">
                                    <Settings size={16} />
                                    設定
                                </button>
                                <button className="action-btn">
                                    <Activity size={16} />
                                    活動日誌
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <Building size={48} />
                            <p>選擇一個租戶查看詳情</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
