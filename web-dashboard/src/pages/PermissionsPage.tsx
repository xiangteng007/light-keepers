import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Shield,
    Users,
    FileKey,
    Search,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    AlertTriangle,
} from 'lucide-react';
import './PermissionsPage.css';

// Types
interface AdminAccount {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    roleLevel: number;
    roleDisplayName: string;
    isActive: boolean;
    lastLoginAt: string | null;
}

interface Role {
    id: string;
    name: string;
    displayName: string;
    level: number;
    description: string;
}

interface PagePermission {
    id: string;
    pageKey: string;
    pageName: string;
    pagePath: string;
    requiredLevel: number;
    icon: string;
    sortOrder: number;
    isVisible: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1';

export default function PermissionsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'pages'>('users');
    const [accounts, setAccounts] = useState<AdminAccount[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [pagePermissions, setPagePermissions] = useState<PagePermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [savingUser, setSavingUser] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 獲取 token
    const getToken = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

    // Fetch all data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = getToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            const [accountsRes, rolesRes, permissionsRes] = await Promise.all([
                fetch(`${API_BASE}/accounts/admin`, { headers }),
                fetch(`${API_BASE}/accounts/roles`, { headers }),
                fetch(`${API_BASE}/accounts/page-permissions`, { headers }),
            ]);

            if (!accountsRes.ok || !rolesRes.ok || !permissionsRes.ok) {
                throw new Error('無法載入資料');
            }

            const [accountsData, rolesData, permissionsData] = await Promise.all([
                accountsRes.json(),
                rolesRes.json(),
                permissionsRes.json(),
            ]);

            setAccounts(accountsData);
            setRoles(rolesData);
            setPagePermissions(permissionsData);
        } catch (err) {
            setError('載入資料失敗，請稍後再試');
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Update user roles
    const handleRoleChange = async (accountId: string, roleNames: string[]) => {
        setSavingUser(accountId);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/accounts/${accountId}/roles`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ roleNames }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '更新失敗');
            }

            const updatedAccount = await response.json();

            // Update local state
            setAccounts(prev =>
                prev.map(acc =>
                    acc.id === accountId
                        ? {
                            ...acc,
                            roles: updatedAccount.roles,
                            roleLevel: updatedAccount.roleLevel,
                            roleDisplayName: updatedAccount.roleDisplayName,
                        }
                        : acc
                )
            );

            setMessage({ type: 'success', text: '角色已更新' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: unknown) {
            const error = err as Error;
            setMessage({ type: 'error', text: error.message || '更新失敗' });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingUser(null);
        }
    };

    // Update page permission
    const handlePagePermissionChange = async (
        pageKey: string,
        updates: { requiredLevel?: number; isVisible?: boolean }
    ) => {
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/accounts/page-permissions/${pageKey}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '更新失敗');
            }

            const updatedPermission = await response.json();

            // Update local state
            setPagePermissions(prev =>
                prev.map(p => (p.pageKey === pageKey ? updatedPermission : p))
            );

            setMessage({ type: 'success', text: '頁面權限已更新' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: unknown) {
            const error = err as Error;
            setMessage({ type: 'error', text: error.message || '更新失敗' });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    // Filter accounts by search term
    const filteredAccounts = accounts.filter(
        acc =>
            acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Can operator modify this account
    const canModify = (targetLevel: number): boolean => {
        const operatorLevel = user?.roleLevel ?? 0;
        return operatorLevel > targetLevel;
    };

    // Render role badges
    const renderRoleBadges = (account: AdminAccount) => {
        const availableRoles = roles.filter(r => r.level < (user?.roleLevel ?? 0));

        return (
            <div className="role-badges">
                {availableRoles.map(role => {
                    const hasRole = account.roles.includes(role.name);
                    return (
                        <button
                            key={role.name}
                            className={`role-badge ${hasRole ? 'role-badge--active' : ''}`}
                            onClick={() => {
                                const newRoles = hasRole
                                    ? account.roles.filter(r => r !== role.name)
                                    : [...account.roles, role.name];
                                handleRoleChange(account.id, newRoles);
                            }}
                            disabled={savingUser === account.id || !canModify(account.roleLevel)}
                        >
                            {role.displayName}
                            {hasRole && <span className="role-badge__check">✓</span>}
                        </button>
                    );
                })}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="permissions-page">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="permissions-page">
            <div className="permissions-header">
                <div className="permissions-header__left">
                    <h1><Shield size={28} /> 權限管理</h1>
                    <p>管理用戶角色和頁面存取權限</p>
                </div>
                <button className="lk-btn lk-btn--secondary" onClick={fetchData}>
                    <RefreshCw size={16} /> 重新載入
                </button>
            </div>

            {message && (
                <div className={`permissions-message permissions-message--${message.type}`}>
                    {message.text}
                </div>
            )}

            {error && (
                <div className="permissions-error">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="permissions-tabs">
                <button
                    className={`permissions-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} />
                    用戶角色管理
                </button>
                <button
                    className={`permissions-tab ${activeTab === 'pages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pages')}
                >
                    <FileKey size={18} />
                    頁面權限配置
                </button>
            </div>

            <div className="permissions-content">
                {activeTab === 'users' && (
                    <div className="users-section">
                        <div className="users-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="搜尋用戶..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="users-list">
                            {filteredAccounts.length === 0 ? (
                                <div className="users-empty">沒有找到符合條件的用戶</div>
                            ) : (
                                filteredAccounts.map(account => (
                                    <div
                                        key={account.id}
                                        className={`user-card ${expandedUser === account.id ? 'expanded' : ''}`}
                                    >
                                        <div
                                            className="user-card__header"
                                            onClick={() =>
                                                setExpandedUser(expandedUser === account.id ? null : account.id)
                                            }
                                        >
                                            <div className="user-card__info">
                                                <div className="user-card__avatar">
                                                    {account.displayName?.charAt(0) || account.email?.charAt(0) || '?'}
                                                </div>
                                                <div className="user-card__details">
                                                    <span className="user-card__name">
                                                        {account.displayName || '未設定名稱'}
                                                    </span>
                                                    <span className="user-card__email">{account.email}</span>
                                                </div>
                                            </div>
                                            <div className="user-card__right">
                                                <span className={`user-card__level level-${account.roleLevel}`}>
                                                    {account.roleDisplayName}
                                                </span>
                                                {expandedUser === account.id ? (
                                                    <ChevronUp size={20} />
                                                ) : (
                                                    <ChevronDown size={20} />
                                                )}
                                            </div>
                                        </div>

                                        {expandedUser === account.id && (
                                            <div className="user-card__body">
                                                <h4>角色設定</h4>
                                                {canModify(account.roleLevel) ? (
                                                    <>
                                                        {renderRoleBadges(account)}
                                                        {savingUser === account.id && (
                                                            <div className="user-card__saving">
                                                                <RefreshCw size={14} className="spin" />
                                                                儲存中...
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="user-card__readonly">
                                                        <AlertTriangle size={16} />
                                                        無法修改權限等於或高於自己的用戶
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pages' && (
                    <div className="pages-section">
                        <div className="pages-notice">
                            <AlertTriangle size={16} />
                            頁面權限配置僅限系統擁有者 (Owner) 可以修改
                        </div>

                        <div className="pages-list">
                            {pagePermissions.map(page => (
                                <div key={page.pageKey} className="page-card">
                                    <div className="page-card__info">
                                        <span className="page-card__name">{page.pageName}</span>
                                        <span className="page-card__path">{page.pagePath}</span>
                                    </div>
                                    <div className="page-card__controls">
                                        <div className="page-card__level">
                                            <label>最低權限</label>
                                            <select
                                                value={page.requiredLevel}
                                                onChange={e =>
                                                    handlePagePermissionChange(page.pageKey, {
                                                        requiredLevel: parseInt(e.target.value),
                                                    })
                                                }
                                                disabled={(user?.roleLevel ?? 0) < 5}
                                            >
                                                {roles.map(role => (
                                                    <option key={role.level} value={role.level}>
                                                        {role.displayName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="page-card__visible">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={page.isVisible}
                                                    onChange={e =>
                                                        handlePagePermissionChange(page.pageKey, {
                                                            isVisible: e.target.checked,
                                                        })
                                                    }
                                                    disabled={(user?.roleLevel ?? 0) < 5}
                                                />
                                                顯示在導航
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
