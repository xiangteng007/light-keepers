/**
 * AccountsPage.tsx
 * 
 * 帳戶管理頁面 - Core Domain
 * 功能：用戶 CRUD、角色分配、帳戶狀態管理
 */
import { useState } from 'react';
import { UserCog, Plus, Search, MoreVertical, Shield, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import './AccountsPage.css';

interface Account {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    roleLevel: number;
    status: 'active' | 'inactive' | 'pending';
    lastLogin: string;
    createdAt: string;
}

const MOCK_ACCOUNTS: Account[] = [
    { id: 'U-001', name: '王系統管理員', email: 'admin@lightkeepers.org', phone: '0912-345-678', role: '系統擁有者', roleLevel: 5, status: 'active', lastLogin: '2026-01-12 10:30', createdAt: '2024-01-01' },
    { id: 'U-002', name: '李理事長', email: 'chairman@lightkeepers.org', phone: '0923-456-789', role: '理事長', roleLevel: 4, status: 'active', lastLogin: '2026-01-11 18:00', createdAt: '2024-03-15' },
    { id: 'U-003', name: '張常務理事', email: 'manager@lightkeepers.org', phone: '0934-567-890', role: '常務理事', roleLevel: 3, status: 'active', lastLogin: '2026-01-12 08:00', createdAt: '2024-06-01' },
    { id: 'U-004', name: '陳幹部', email: 'supervisor@lightkeepers.org', phone: '0945-678-901', role: '幹部', roleLevel: 2, status: 'inactive', lastLogin: '2026-01-05 10:00', createdAt: '2024-09-01' },
    { id: 'U-005', name: '林志工', email: 'volunteer@lightkeepers.org', phone: '0956-789-012', role: '志工', roleLevel: 1, status: 'pending', lastLogin: '-', createdAt: '2026-01-10' },
];

const ROLE_COLORS: Record<number, string> = {
    5: '#A855F7', 4: '#3B82F6', 3: '#22c55e', 2: '#eab308', 1: '#94A3B8'
};

export default function AccountsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    return (
        <div className="accounts-page">
            <header className="accounts-header">
                <div className="header-title">
                    <UserCog size={24} />
                    <div>
                        <h1>帳戶管理</h1>
                        <p>管理系統用戶與權限角色</p>
                    </div>
                </div>
                <button className="btn-add-user">
                    <Plus size={16} />
                    新增帳戶
                </button>
            </header>

            <div className="accounts-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="搜尋姓名或 Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="all">所有角色</option>
                    <option value="5">系統擁有者</option>
                    <option value="4">理事長</option>
                    <option value="3">常務理事</option>
                    <option value="2">幹部</option>
                    <option value="1">志工</option>
                </select>
            </div>

            <div className="accounts-grid">
                {MOCK_ACCOUNTS.map(account => (
                    <div key={account.id} className={`account-card ${account.status}`}>
                        <div className="card-header">
                            <div className="avatar" style={{ borderColor: ROLE_COLORS[account.roleLevel] }}>
                                {account.name.charAt(0)}
                            </div>
                            <div className="account-info">
                                <h3>{account.name}</h3>
                                <span className="role-badge" style={{ background: `${ROLE_COLORS[account.roleLevel]}20`, color: ROLE_COLORS[account.roleLevel] }}>
                                    <Shield size={12} />
                                    {account.role}
                                </span>
                            </div>
                            <button className="btn-more">
                                <MoreVertical size={16} />
                            </button>
                        </div>

                        <div className="card-body">
                            <div className="info-row">
                                <Mail size={14} />
                                <span>{account.email}</span>
                            </div>
                            <div className="info-row">
                                <Phone size={14} />
                                <span>{account.phone}</span>
                            </div>
                        </div>

                        <div className="card-footer">
                            <div className="status">
                                {account.status === 'active' && <><CheckCircle size={14} className="active" /> 啟用中</>}
                                {account.status === 'inactive' && <><XCircle size={14} className="inactive" /> 已停用</>}
                                {account.status === 'pending' && <><CheckCircle size={14} className="pending" /> 待審核</>}
                            </div>
                            <span className="last-login">最後登入：{account.lastLogin}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
