/**
 * widgets/governance/GovernanceWidgets.tsx
 *
 * Governance domain: audit log, accounts, tenants, roles/permissions, feature flags.
 */
import { CheckCircle, AlertTriangle, Shield, Building, Users, Database, Percent } from 'lucide-react';
import { CheckIcon, CloseIcon } from '../../../design-system/icons';

export const AuditTableWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>
                    <th style={{ padding: '10px' }}>時間</th>
                    <th style={{ padding: '10px' }}>使用者</th>
                    <th style={{ padding: '10px' }}>操作</th>
                    <th style={{ padding: '10px' }}>資源</th>
                    <th style={{ padding: '10px' }}>狀態</th>
                </tr>
            </thead>
            <tbody>
                {[
                    { time: '10:45:32', user: 'admin@...', action: 'LOGIN', resource: '系統登入', status: 'success' },
                    { time: '10:42:15', user: 'manager@...', action: 'UPDATE', resource: '志工資料', status: 'success' },
                    { time: '10:38:50', user: 'unknown', action: 'LOGIN_FAILED', resource: '系統登入', status: 'error' },
                ].map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(47, 54, 65, 0.3)' }}>
                        <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.time}</td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{log.user}</td>
                        <td style={{ padding: '10px' }}>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                background: log.action === 'LOGIN' ? 'rgba(59, 130, 246, 0.2)' : log.action === 'UPDATE' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: log.action === 'LOGIN' ? '#3B82F6' : log.action === 'UPDATE' ? '#eab308' : '#ef4444',
                            }}>
                                {log.action}
                            </span>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{log.resource}</td>
                        <td style={{ padding: '10px' }}>
                            {log.status === 'success' ? <CheckCircle size={14} style={{ color: '#22c55e' }} /> : <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const AccountsGridWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {[
                { name: '王系統管理員', role: '系統擁有者', level: 5, status: 'active' },
                { name: '李理事長', role: '理事長', level: 4, status: 'active' },
                { name: '張常務理事', role: '常務理事', level: 3, status: 'active' },
                { name: '陳幹部', role: '幹部', level: 2, status: 'inactive' },
            ].map((account, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    opacity: account.status === 'inactive' ? 0.6 : 1,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(195, 155, 111, 0.2)',
                            border: `2px solid ${account.level === 5 ? '#A855F7' : account.level === 4 ? '#3B82F6' : '#C39B6F'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-gold)',
                            fontWeight: 600,
                        }}>
                            {account.name.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{account.name}</div>
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '20px',
                                background: `${account.level === 5 ? '#A855F7' : account.level === 4 ? '#3B82F6' : '#C39B6F'}20`,
                                color: account.level === 5 ? '#A855F7' : account.level === 4 ? '#3B82F6' : '#C39B6F',
                            }}>
                                <Shield size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                {account.role}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const TenantListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { name: '光守護者總會', slug: 'lightkeepers-hq', plan: 'enterprise', users: 150 },
            { name: '台北市救災協會', slug: 'taipei-rescue', plan: 'pro', users: 45 },
            { name: '新北市志工團', slug: 'newtaipei-vol', plan: 'pro', users: 30 },
        ].map((tenant, i) => (
            <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: i === 0 ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
                cursor: 'pointer',
                border: i === 0 ? '1px solid rgba(195, 155, 111, 0.3)' : '1px solid transparent',
            }}>
                <Building size={20} style={{ color: 'var(--accent-gold)' }} />
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{tenant.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/{tenant.slug}</div>
                </div>
                <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: tenant.plan === 'enterprise' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: tenant.plan === 'enterprise' ? '#A855F7' : '#3B82F6',
                }}>
                    {tenant.plan.toUpperCase()}
                </span>
            </div>
        ))}
    </div>
);

export const TenantDetailWidget = () => (
    <div style={{ height: '100%', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>光守護者總會</h3>
            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '12px' }}>
                active
            </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
                <Users size={18} style={{ color: 'var(--accent-gold)', marginBottom: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>用戶數</div>
                <div className="u-mono" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>150 / 500</div>
                <div style={{ height: '4px', background: 'rgba(47, 54, 65, 0.5)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '30%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #C39B6F)' }} />
                </div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
                <Database size={18} style={{ color: 'var(--accent-gold)', marginBottom: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>儲存空間</div>
                <div className="u-mono" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>45 / 100 GB</div>
                <div style={{ height: '4px', background: 'rgba(47, 54, 65, 0.5)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '45%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #C39B6F)' }} />
                </div>
            </div>
        </div>
    </div>
);

export const FeatureFlagsWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {[
                { name: 'ai_summary', desc: 'AI 自動彙整功能', status: 'enabled', rollout: 100 },
                { name: 'drone_control_v2', desc: '無人機控制新界面', status: 'partial', rollout: 30 },
                { name: 'realtime_chat', desc: '即時聊天功能', status: 'enabled', rollout: 100 },
                { name: 'blockchain_tracking', desc: '區塊鏈供應鏈追蹤', status: 'disabled', rollout: 0 },
            ].map((flag, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${flag.status === 'enabled' ? '#22c55e' : flag.status === 'partial' ? '#eab308' : '#ef4444'}`,
                    opacity: flag.status === 'disabled' ? 0.6 : 1,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <code style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            background: 'rgba(195, 155, 111, 0.1)',
                            borderRadius: '4px',
                            color: 'var(--accent-gold)',
                        }}>
                            {flag.name}
                        </code>
                        <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: flag.status === 'enabled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: flag.status === 'enabled' ? '#ef4444' : '#3B82F6',
                        }}>
                            development
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{flag.desc}</div>
                    {flag.status === 'partial' && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <Percent size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                灰度 <span className="u-mono">{flag.rollout}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(47, 54, 65, 0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${flag.rollout}%`, height: '100%', background: '#eab308' }} />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

export const RoleListWidget = () => (
    <div style={{ height: '100%', padding: '8px' }}>
        {[
            { name: '系統擁有者', level: 5, color: '#A855F7' },
            { name: '理事長', level: 4, color: '#3B82F6' },
            { name: '常務理事', level: 3, color: '#22c55e' },
            { name: '幹部', level: 2, color: '#eab308' },
            { name: '志工', level: 1, color: '#C39B6F' },
        ].map((role, i) => (
            <div key={i} style={{
                padding: '12px',
                background: i === 0 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '6px',
                cursor: 'pointer',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: role.color }} />
                    <span style={{ fontSize: '13px', color: i === 0 ? role.color : 'var(--text-primary)' }}>{role.name}</span>
                    <span className="u-mono" style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>Lv.{role.level}</span>
                </div>
            </div>
        ))}
    </div>
);

export const PermissionMatrixWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '16px', fontWeight: 600 }}>權限矩陣</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>功能</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>Lv.1</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>Lv.2</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>Lv.3</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>Lv.4</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>Lv.5</th>
                </tr>
            </thead>
            <tbody>
                {['查看地圖', '編輯任務', '管理人員', '系統設定'].map((perm, i) => (
                    <tr key={i}>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{perm}</td>
                        {[1, 2, 3, 4, 5].map(level => (
                            <td key={level} style={{ padding: '8px', textAlign: 'center' }}>
                                {level >= i + 1
                                    ? <CheckIcon size={14} aria-hidden="true" style={{ color: '#22c55e', verticalAlign: 'middle' }} />
                                    : <CloseIcon size={14} aria-hidden="true" style={{ color: '#ef4444', verticalAlign: 'middle' }} />}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
