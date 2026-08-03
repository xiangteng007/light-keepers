import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
/* Trash2(刪除)/Ban(停權)/ArrowUpDown(排序) 無 B3c 對應，誠實保留（見 notes） */
import { Trash2, Ban, ArrowUpDown } from 'lucide-react';
import {
    ShieldIcon,
    TeamsIcon,
    LockIcon,
    SearchIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    SyncIcon,
    WarningIcon,
} from '../design-system/icons';
import { deleteAccount, blacklistAccount } from '../api/services';
import { Button, Badge, Alert, Modal, InputField } from '../design-system';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import './PermissionsPage.css';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

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
    createdAt: string;
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

// 角色層級徽章 variant 對照——這是行政角色分級，非 DESIGN_LANGUAGE §3 的危急/警戒狀態色，
// 因此刻意避開 danger（保留給生命安全語意），改用中性/裝飾性 variant 做視覺分層。
const LEVEL_BADGE_VARIANT: Record<number, 'default' | 'info' | 'success' | 'subtle' | 'warning' | 'gradient'> = {
    0: 'default',
    1: 'info',
    2: 'success',
    3: 'subtle',
    4: 'warning',
    5: 'gradient',
};

export default function PermissionsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'general' | 'pages'>('users');
    const [accounts, setAccounts] = useState<AdminAccount[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [pagePermissions, setPagePermissions] = useState<PagePermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [savingUser, setSavingUser] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Fetch all data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [accountsRes, rolesRes, permissionsRes] = await Promise.all([
                api.get('/accounts/admin'),
                api.get('/accounts/roles'),
                api.get('/accounts/page-permissions'),
            ]);

            setAccounts(accountsRes.data);
            setRoles(rolesRes.data);
            setPagePermissions(permissionsRes.data);
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
            const response = await api.patch(`/accounts/${accountId}/roles`, { roleNames });
            const updatedAccount = response.data;

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
            setMessage({ type: 'error', text: getApiErrorMessage(err, '更新失敗') });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingUser(null);
        }
    };

    // Update page permission
    const handlePagePermissionChange = async (
        pageKey: string,
        updates: { requiredLevel?: number; isVisible?: boolean; pageName?: string; sortOrder?: number }
    ) => {
        try {
            const response = await api.patch(`/accounts/page-permissions/${pageKey}`, updates);
            const updatedPermission = response.data;

            // Update local state
            setPagePermissions(prev =>
                prev.map(p => (p.pageKey === pageKey ? updatedPermission : p))
            );

            setMessage({ type: 'success', text: '頁面權限已更新' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '更新失敗') });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    // Move page up or down in order
    const movePageOrder = async (pageKey: string, direction: 'up' | 'down') => {
        const sortedPages = [...pagePermissions].sort((a, b) => a.sortOrder - b.sortOrder);
        const currentIndex = sortedPages.findIndex(p => p.pageKey === pageKey);

        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === sortedPages.length - 1) return;

        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const currentPage = sortedPages[currentIndex];
        const swapPage = sortedPages[swapIndex];

        // Swap sortOrder values
        const tempOrder = currentPage.sortOrder;
        const newCurrentOrder = swapPage.sortOrder;
        const newSwapOrder = tempOrder;

        // Update local state immediately for responsiveness
        setPagePermissions(prev =>
            prev.map(p => {
                if (p.pageKey === currentPage.pageKey) return { ...p, sortOrder: newCurrentOrder };
                if (p.pageKey === swapPage.pageKey) return { ...p, sortOrder: newSwapOrder };
                return p;
            })
        );

        // Update backend
        try {
            await Promise.all([
                api.patch(`/accounts/page-permissions/${currentPage.pageKey}`, { sortOrder: newCurrentOrder }),
                api.patch(`/accounts/page-permissions/${swapPage.pageKey}`, { sortOrder: newSwapOrder }),
            ]);
        } catch (err) {
            console.error('Failed to update sort order:', err);
            // Revert on error
            setPagePermissions(prev =>
                prev.map(p => {
                    if (p.pageKey === currentPage.pageKey) return { ...p, sortOrder: tempOrder };
                    if (p.pageKey === swapPage.pageKey) return { ...p, sortOrder: swapPage.sortOrder };
                    return p;
                })
            );
        }
    };

    // Filter accounts by search term
    const filteredAccounts = accounts.filter(
        acc =>
            acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 按 roleLevel 從高到低排序（志工權限頁面用）
    const sortedFilteredAccounts = [...filteredAccounts].sort((a, b) => b.roleLevel - a.roleLevel);

    // Can operator modify this account
    const canModify = (targetLevel: number): boolean => {
        const operatorLevel = user?.roleLevel ?? 0;
        return operatorLevel > targetLevel;
    };

    // 刪除帳號
    const handleDeleteAccount = async (accountId: string, accountName: string) => {
        if (!confirm(`確定要刪除帳號「${accountName}」嗎？此操作不可復原。`)) return;

        setProcessingId(accountId);
        try {
            await deleteAccount(accountId);
            setAccounts(prev => prev.filter(acc => acc.id !== accountId));
            setMessage({ type: 'success', text: '帳號已刪除' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '刪除失敗') });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setProcessingId(null);
        }
    };

    // 加入黑名單
    const handleBlacklistAccount = async (accountId: string, accountName: string) => {
        const reason = prompt(`請輸入將「${accountName}」加入黑名單的原因：`);
        if (reason === null) return;

        setProcessingId(accountId);
        try {
            await blacklistAccount(accountId, reason);
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, isActive: false } : acc
            ));
            setMessage({ type: 'success', text: '帳號已加入黑名單' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '操作失敗') });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setProcessingId(null);
        }
    };

    // 排序一般民眾帳號
    const sortedGeneralAccounts = accounts
        .filter(acc => acc.roleLevel === 0)
        .filter(acc =>
            acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return (a.displayName || a.email).localeCompare(b.displayName || b.email);
        });

    // Render role badges (single select - only one role allowed)
    const renderRoleBadges = (account: AdminAccount) => {
        // 先過濾出低於當前用戶權限的角色，再去除重複的角色名稱
        const availableRoles = roles
            .filter(r => r.level < (user?.roleLevel ?? 0))
            .filter((role, index, self) =>
                index === self.findIndex(r => r.name === role.name)
            )
            .sort((a, b) => a.level - b.level);

        // 找出用戶當前的最高角色
        const currentRole = account.roles[0] || '';

        return (
            <div className="role-badges" role="group" aria-label="選擇角色">
                {availableRoles.map(role => {
                    const isSelected = currentRole === role.name;
                    return (
                        <Button
                            key={role.name}
                            type="button"
                            size="sm"
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={() => {
                                // 單選模式 - 只設定這一個角色
                                if (!isSelected) {
                                    handleRoleChange(account.id, [role.name]);
                                }
                            }}
                            disabled={savingUser === account.id || !canModify(account.roleLevel) || isSelected}
                            aria-pressed={isSelected}
                        >
                            {role.displayName}
                            {isSelected ? ' ✓' : ''}
                        </Button>
                    );
                })}
            </div>
        );
    };

    const renderLoadingSkeleton = () => (
        <div className="users-list" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="user-card user-card--skeleton">
                    <div className="user-card__header">
                        <div className="user-card__info">
                            <Skeleton variant="avatar" width={40} height={40} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                <Skeleton width={140} height={14} />
                                <Skeleton width={180} height={12} />
                            </div>
                        </div>
                        <Skeleton width={72} height={24} />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="permissions-page">
            <div className="page-header">
                <div className="page-header__text">
                    <h1><ShieldIcon size={24} aria-hidden="true" /> 權限管理</h1>
                    <p>管理用戶角色和頁面存取權限</p>
                </div>
                <Button variant="secondary" onClick={fetchData} icon={<SyncIcon size={16} />} disabled={isLoading}>
                    重新載入
                </Button>
            </div>

            {message && (
                <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
                    {message.text}
                </Alert>
            )}

            {error && (
                <Alert
                    variant="danger"
                    title="載入失敗"
                    icon={<WarningIcon size={16} />}
                >
                    <div className="permissions-error__body">
                        <span>{error}</span>
                        <Button size="sm" variant="secondary" onClick={fetchData}>重試</Button>
                    </div>
                </Alert>
            )}

            <div className="permissions-tabs" role="tablist" aria-label="權限管理分頁">
                <button
                    role="tab"
                    aria-selected={activeTab === 'users'}
                    className={`permissions-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <TeamsIcon size={18} aria-hidden="true" />
                    志工權限
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'general'}
                    className={`permissions-tab ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    <TeamsIcon size={18} aria-hidden="true" />
                    一般民眾
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'pages'}
                    className={`permissions-tab ${activeTab === 'pages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pages')}
                >
                    <LockIcon size={18} aria-hidden="true" />
                    頁面權限配置
                </button>
            </div>

            <div className="permissions-content">
                {/* 一般民眾 Tab - 顯示 level 0 的帳號 */}
                {activeTab === 'general' && (
                    <div className="general-section">
                        <div className="general-toolbar">
                            <InputField
                                prefix={<SearchIcon size={18} aria-hidden="true" />}
                                placeholder="搜尋一般民眾..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                aria-label="搜尋一般民眾"
                                fullWidth
                            />
                            <div className="sort-dropdown">
                                <ArrowUpDown size={16} aria-hidden="true" />
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value as 'date' | 'name')}
                                    aria-label="排序方式"
                                >
                                    <option value="date">註冊時間</option>
                                    <option value="name">名稱</option>
                                </select>
                            </div>
                        </div>

                        {isLoading ? renderLoadingSkeleton() : sortedGeneralAccounts.length === 0 ? (
                            <EmptyState
                                variant="search"
                                title="沒有找到符合條件的帳號"
                                description="試試調整搜尋關鍵字，或清空搜尋條件查看全部一般民眾帳號。"
                            />
                        ) : (
                            <div className="users-list">
                                {sortedGeneralAccounts.map(account => (
                                    <div
                                        key={account.id}
                                        className={`user-card user-card--general ${!account.isActive ? 'user-card--blacklisted' : ''}`}
                                        onClick={() => setSelectedAccount(account)}
                                    >
                                        <div className="user-card__info">
                                            <div className="user-card__avatar">
                                                {account.displayName?.charAt(0) || account.email?.charAt(0) || '?'}
                                            </div>
                                            <div className="user-card__details">
                                                <span className="user-card__name">
                                                    {account.displayName || '未設定名稱'}
                                                    {!account.isActive && (
                                                        <Badge variant="danger" size="sm" icon={<Ban size={11} aria-hidden="true" />}>
                                                            黑名單
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="user-card__email">{account.email}</span>
                                                <span className="user-card__date">
                                                    註冊：{new Date(account.createdAt).toLocaleDateString('zh-TW')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="user-card__actions">
                                            {account.isActive && (
                                                <button
                                                    className="action-btn action-btn--warning"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBlacklistAccount(account.id, account.displayName || account.email);
                                                    }}
                                                    disabled={processingId === account.id}
                                                    aria-label="加入黑名單"
                                                    title="加入黑名單"
                                                >
                                                    <Ban size={16} aria-hidden="true" />
                                                </button>
                                            )}
                                            <button
                                                className="action-btn action-btn--danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteAccount(account.id, account.displayName || account.email);
                                                }}
                                                disabled={processingId === account.id}
                                                aria-label="刪除帳號"
                                                title="刪除帳號"
                                            >
                                                <Trash2 size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 帳號詳情彈窗 */}
                <Modal
                    isOpen={!!selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    title="帳號詳情"
                    size="sm"
                >
                    {selectedAccount && (
                        <div className="account-detail">
                            <div className="account-detail__avatar">
                                {selectedAccount.displayName?.charAt(0) || selectedAccount.email?.charAt(0) || '?'}
                            </div>
                            <div className="account-detail__info">
                                <p><strong>名稱：</strong>{selectedAccount.displayName || '未設定'}</p>
                                <p><strong>Email：</strong>{selectedAccount.email}</p>
                                <p><strong>角色：</strong>{selectedAccount.roleDisplayName}</p>
                                <p>
                                    <strong>狀態：</strong>
                                    {selectedAccount.isActive
                                        ? <Badge variant="success" size="sm">正常</Badge>
                                        : <Badge variant="danger" size="sm" icon={<Ban size={11} aria-hidden="true" />}>黑名單</Badge>}
                                </p>
                                <p><strong>註冊時間：</strong>{new Date(selectedAccount.createdAt).toLocaleString('zh-TW')}</p>
                                {selectedAccount.lastLoginAt && (
                                    <p><strong>最後登入：</strong>{new Date(selectedAccount.lastLoginAt).toLocaleString('zh-TW')}</p>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>

                {activeTab === 'users' && (
                    <div className="users-section">
                        <InputField
                            prefix={<SearchIcon size={18} aria-hidden="true" />}
                            placeholder="搜尋用戶..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            aria-label="搜尋用戶"
                            fullWidth
                        />

                        {isLoading ? renderLoadingSkeleton() : sortedFilteredAccounts.length === 0 ? (
                            <EmptyState
                                variant="search"
                                title="沒有找到符合條件的用戶"
                                description="試試調整搜尋關鍵字。"
                            />
                        ) : (
                            <div className="users-list">
                                {sortedFilteredAccounts.map(account => (
                                    <div
                                        key={account.id}
                                        className={`user-card ${expandedUser === account.id ? 'expanded' : ''}`}
                                    >
                                        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                                        <div
                                            className="user-card__header"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                setExpandedUser(expandedUser === account.id ? null : account.id)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setExpandedUser(expandedUser === account.id ? null : account.id);
                                                }
                                            }}
                                            aria-expanded={expandedUser === account.id}
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
                                                <Badge variant={LEVEL_BADGE_VARIANT[account.roleLevel] ?? 'default'} size="sm">
                                                    {account.roleDisplayName}
                                                </Badge>
                                                {/* 理事長(level 4)以上可見刪除/黑名單按鈕 */}
                                                {(user?.roleLevel ?? 0) >= 4 && canModify(account.roleLevel) && (
                                                    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                                                    <span
                                                        className="user-card__actions"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {account.isActive && (
                                                            <button
                                                                className="action-btn action-btn--warning"
                                                                onClick={() => handleBlacklistAccount(account.id, account.displayName || account.email)}
                                                                disabled={processingId === account.id}
                                                                aria-label="加入黑名單"
                                                                title="加入黑名單"
                                                            >
                                                                <Ban size={16} aria-hidden="true" />
                                                            </button>
                                                        )}
                                                        <button
                                                            className="action-btn action-btn--danger"
                                                            onClick={() => handleDeleteAccount(account.id, account.displayName || account.email)}
                                                            disabled={processingId === account.id}
                                                            aria-label="刪除帳號"
                                                            title="刪除帳號"
                                                        >
                                                            <Trash2 size={16} aria-hidden="true" />
                                                        </button>
                                                    </span>
                                                )}
                                                {expandedUser === account.id ? (
                                                    <ChevronUpIcon size={20} aria-hidden="true" />
                                                ) : (
                                                    <ChevronDownIcon size={20} aria-hidden="true" />
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
                                                                <SyncIcon size={14} className="spin" aria-hidden="true" />
                                                                儲存中...
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="user-card__readonly">
                                                        <WarningIcon size={16} aria-hidden="true" />
                                                        無法修改權限等於或高於自己的用戶
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pages' && (
                    <div className="pages-section">
                        <Alert variant="warning" icon={<WarningIcon size={16} />}>
                            頁面權限配置僅限系統擁有者 (Owner) 可以修改
                        </Alert>

                        {isLoading ? renderLoadingSkeleton() : (
                            <div className="pages-list">
                                {pagePermissions
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map(page => (
                                        <div key={page.pageKey} className="page-card">
                                            <div className="page-card__info">
                                                <div className="page-card__name-row">
                                                    <input
                                                        type="text"
                                                        className="page-card__name-input"
                                                        value={page.pageName}
                                                        onChange={e => {
                                                            // Update local state immediately
                                                            setPagePermissions(prev =>
                                                                prev.map(p =>
                                                                    p.pageKey === page.pageKey
                                                                        ? { ...p, pageName: e.target.value }
                                                                        : p
                                                                )
                                                            );
                                                        }}
                                                        onBlur={e =>
                                                            handlePagePermissionChange(page.pageKey, {
                                                                pageName: e.target.value,
                                                            })
                                                        }
                                                        disabled={(user?.roleLevel ?? 0) < 5}
                                                        placeholder="頁面名稱"
                                                        aria-label={`頁面名稱 - ${page.pagePath}`}
                                                    />
                                                    <span className="page-card__path">{page.pagePath}</span>
                                                </div>
                                            </div>
                                            <div className="page-card__controls">
                                                <div className="page-card__sort-arrows">
                                                    <button
                                                        className="sort-arrow-btn"
                                                        onClick={() => movePageOrder(page.pageKey, 'up')}
                                                        disabled={(user?.roleLevel ?? 0) < 5 || pagePermissions.sort((a, b) => a.sortOrder - b.sortOrder).findIndex(p => p.pageKey === page.pageKey) === 0}
                                                        aria-label={`「${page.pageName}」上移`}
                                                        title="上移"
                                                    >
                                                        <ChevronUpIcon size={18} aria-hidden="true" />
                                                    </button>
                                                    <span className="sort-order-display">{page.sortOrder}</span>
                                                    <button
                                                        className="sort-arrow-btn"
                                                        onClick={() => movePageOrder(page.pageKey, 'down')}
                                                        disabled={(user?.roleLevel ?? 0) < 5 || pagePermissions.sort((a, b) => a.sortOrder - b.sortOrder).findIndex(p => p.pageKey === page.pageKey) === pagePermissions.length - 1}
                                                        aria-label={`「${page.pageName}」下移`}
                                                        title="下移"
                                                    >
                                                        <ChevronDownIcon size={18} aria-hidden="true" />
                                                    </button>
                                                </div>
                                                <div className="page-card__level">
                                                    <label htmlFor={`level-${page.pageKey}`}>最低權限</label>
                                                    <select
                                                        id={`level-${page.pageKey}`}
                                                        value={page.requiredLevel}
                                                        onChange={e =>
                                                            handlePagePermissionChange(page.pageKey, {
                                                                requiredLevel: parseInt(e.target.value),
                                                            })
                                                        }
                                                        disabled={(user?.roleLevel ?? 0) < 5}
                                                    >
                                                        {/* 只顯示唯一的 level，避免重複選項 */}
                                                        {roles
                                                            .filter((role, index, self) =>
                                                                index === self.findIndex(r => r.level === role.level)
                                                            )
                                                            .sort((a, b) => a.level - b.level)
                                                            .map(role => (
                                                                <option key={role.level} value={role.level}>
                                                                    {role.displayName}
                                                                </option>
                                                            ))
                                                        }
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
                                                        顯示
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
