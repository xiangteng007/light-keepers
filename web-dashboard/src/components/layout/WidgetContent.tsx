/**
 * WidgetContent.tsx
 * 
 * Centralized widget content components for all pages
 * Each widget ID maps to its React component content
 */
import React, { useState } from 'react';
import {
    MapPin, Users, Package, AlertTriangle, Layers, Navigation,
    Filter, Search, CheckCircle, Clock, Zap, TrendingUp, TrendingDown,
    Brain, FileText, ScrollText, UserCog, Building, Settings, ToggleLeft,
    Shield, Mail, Phone, Calendar, Database, Activity, GitMerge, Home, Percent
} from 'lucide-react';

// ===== Reusable Placeholder Components =====
const CardPlaceholder = ({ title }: { title: string }) => (
    <div style={{
        padding: '12px',
        background: 'rgba(47, 54, 65, 0.3)',
        borderRadius: '8px',
        marginBottom: '8px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
    }}>
        {title}
    </div>
);

const MetricCard = ({ label, value, trend, color = '#C39B6F' }: { label: string; value: string | number; trend?: 'up' | 'down' | 'stable'; color?: string }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        background: 'rgba(47, 54, 65, 0.3)',
        borderRadius: '8px',
        minWidth: '100px',
    }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</span>
        {trend && (
            <span style={{ marginTop: '4px', color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#94A3B8' }}>
                {trend === 'up' && <TrendingUp size={14} />}
                {trend === 'down' && <TrendingDown size={14} />}
            </span>
        )}
    </div>
);

const ListItem = ({ icon, title, subtitle, status }: { icon: React.ReactNode; title: string; subtitle?: string; status?: 'success' | 'warning' | 'error' }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'rgba(47, 54, 65, 0.3)',
        borderRadius: '8px',
        marginBottom: '8px',
    }}>
        <div style={{ color: 'var(--accent-gold)' }}>{icon}</div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        {status && (
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: status === 'success' ? '#22c55e' : status === 'warning' ? '#eab308' : '#ef4444',
            }} />
        )}
    </div>
);

// ===== Tactical Map Widgets =====
const MapLayersWidget = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', padding: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '8px' }}>
            <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            圖層控制
        </div>
        {['事件標記', '志工位置', '資源點', '路線規劃'].map((layer, i) => (
            <label key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: i < 3 ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
            }}>
                <input type="checkbox" defaultChecked={i < 3} />
                <span>{layer}</span>
            </label>
        ))}
    </div>
);

const TacticalMapWidget = () => (
    <div style={{
        height: '100%',
        background: 'linear-gradient(135deg, #0D1424 0%, #131B2E 100%)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    }}>
        <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(195, 155, 111, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(195, 155, 111, 0.05) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
        }} />
        <MapPin size={48} style={{ color: 'rgba(195, 155, 111, 0.3)' }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            25.0330°N, 121.5654°E
        </div>
    </div>
);

const MapLegendWidget = () => (
    <div style={{ padding: '8px', fontSize: '12px' }}>
        {[
            { color: '#ef4444', label: '緊急' },
            { color: '#f97316', label: '高優先' },
            { color: '#eab308', label: '中優先' },
            { color: '#22c55e', label: '一般' },
        ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
        ))}
    </div>
);

// ===== Resource Matching Widgets =====
const KeyMetricsWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <MetricCard label="待配對" value={5} color="#ef4444" />
        <MetricCard label="已配對" value={12} trend="up" color="#3B82F6" />
        <MetricCard label="已完成" value={28} color="#22c55e" />
        <MetricCard label="配對率" value="91%" trend="up" color="#C39B6F" />
    </div>
);

const AIMatchesWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent-gold)', fontSize: '13px' }}>
            <Zap size={16} />
            <span>AI 智慧配對建議</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 8px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '4px', color: '#A855F7' }}>
                powered by AI
            </span>
        </div>
        {[
            { from: '飲用水 × 500箱', to: '內湖物流中心', score: 92, distance: '4.2km' },
            { from: '發電機 × 5台', to: '消防局倉庫', score: 88, distance: '6.8km' },
        ].map((match, i) => (
            <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `conic-gradient(#22c55e ${match.score}%, rgba(47, 54, 65, 0.5) 0%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#22c55e',
                }}>
                    {match.score}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{match.from}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <GitMerge size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        {match.to} · {match.distance}
                    </div>
                </div>
                <button style={{
                    padding: '6px 12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '6px',
                    color: '#22c55e',
                    fontSize: '11px',
                    cursor: 'pointer',
                }}>
                    確認
                </button>
            </div>
        ))}
    </div>
);

const RequestsListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>需求列表</div>
        {[
            { type: '飲用水', qty: '500箱', location: '信義區避難所', priority: 'critical' },
            { type: '睡袋', qty: '100個', location: '大安區收容中心', priority: 'high' },
            { type: '急救包', qty: '50組', location: '中正區醫療站', priority: 'high' },
        ].map((req, i) => (
            <ListItem
                key={i}
                icon={<Package size={16} />}
                title={`${req.type} × ${req.qty}`}
                subtitle={req.location}
                status={req.priority === 'critical' ? 'error' : req.priority === 'high' ? 'warning' : 'success'}
            />
        ))}
    </div>
);

const SuppliesGridWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>供給庫存</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
                { type: '飲用水', available: 800, unit: '箱' },
                { type: '睡袋', available: 150, unit: '個' },
                { type: '急救包', available: 200, unit: '組' },
                { type: '發電機', available: 10, unit: '台' },
            ].map((supply, i) => (
                <div key={i} style={{
                    padding: '12px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{supply.available}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{supply.type}</div>
                </div>
            ))}
        </div>
    </div>
);

// ===== Reunification Widgets =====
const SearchPanelWidget = () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px', height: '100%' }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 16px',
            background: 'rgba(47, 54, 65, 0.5)',
            border: '1px solid rgba(195, 155, 111, 0.2)',
            borderRadius: '8px',
            flex: 1,
        }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
                type="text"
                placeholder="搜尋姓名或地點..."
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%',
                }}
            />
        </div>
        <select style={{
            padding: '10px 16px',
            background: 'rgba(47, 54, 65, 0.5)',
            border: '1px solid rgba(195, 155, 111, 0.2)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
        }}>
            <option>所有狀態</option>
            <option>尋找中</option>
            <option>已尋獲</option>
            <option>已團聚</option>
        </select>
    </div>
);

const MissingCasesWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {[
                { name: '王小明', age: 8, location: '信義區市政府站', status: 'missing' },
                { name: '李阿姨', age: 72, location: '大安公園', status: 'found' },
                { name: '陳小華', age: 12, location: '士林夜市', status: 'reunited' },
            ].map((person, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${person.status === 'missing' ? '#ef4444' : person.status === 'found' ? '#3B82F6' : '#22c55e'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(168, 85, 247, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#A855F7',
                        }}>
                            <Users size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{person.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{person.age}歲</div>
                        </div>
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            background: person.status === 'missing' ? 'rgba(239, 68, 68, 0.2)' : person.status === 'found' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: person.status === 'missing' ? '#ef4444' : person.status === 'found' ? '#3B82F6' : '#22c55e',
                        }}>
                            {person.status === 'missing' && '尋找中'}
                            {person.status === 'found' && '已尋獲'}
                            {person.status === 'reunited' && '已團聚'}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={12} />
                        {person.location}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ===== AI Summary Widgets =====
const TrendsChartWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        {[
            { label: '事件數量', value: '↓12%', color: '#22c55e', prediction: '預計持續下降' },
            { label: '響應時間', value: '↓15%', color: '#22c55e', prediction: '效率持續改善' },
            { label: '資源需求', value: '↑8%', color: '#ef4444', prediction: '需增加備品' },
            { label: '志工出勤', value: '→2%', color: '#3B82F6', prediction: '維持穩定' },
        ].map((item, i) => (
            <div key={i} style={{
                textAlign: 'center',
                padding: '16px 24px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
            }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.prediction}</div>
            </div>
        ))}
    </div>
);

const AIReportsWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { title: '每日災情彙整報告', type: 'daily', time: '06:00', confidence: 94 },
            { title: '資源調度建議', type: 'recommendation', time: '05:30', confidence: 87 },
            { title: '志工動員效率分析', type: 'analysis', time: '04:00', confidence: 91 },
        ].map((report, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '12px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: report.type === 'daily' ? 'rgba(59, 130, 246, 0.2)' : report.type === 'recommendation' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        color: report.type === 'daily' ? '#3B82F6' : report.type === 'recommendation' ? '#22c55e' : '#A855F7',
                    }}>
                        {report.type === 'daily' && '每日報告'}
                        {report.type === 'recommendation' && '建議'}
                        {report.type === 'analysis' && '分析'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{report.time}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>{report.title}</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>
                    <Brain size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    信心度: {report.confidence}%
                </div>
            </div>
        ))}
    </div>
);

// ===== Audit Widgets =====
const AuditTableWidget = () => (
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
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.time}</td>
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

// ===== Accounts Widgets =====
const AccountsGridWidget = () => (
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

// ===== Tenants Widgets =====
const TenantListWidget = () => (
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

const TenantDetailWidget = () => (
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
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>150 / 500</div>
                <div style={{ height: '4px', background: 'rgba(47, 54, 65, 0.5)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '30%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #C39B6F)' }} />
                </div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
                <Database size={18} style={{ color: 'var(--accent-gold)', marginBottom: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>儲存空間</div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>45 / 100 GB</div>
                <div style={{ height: '4px', background: 'rgba(47, 54, 65, 0.5)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '45%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #C39B6F)' }} />
                </div>
            </div>
        </div>
    </div>
);

// ===== Settings Widgets =====
const SettingsNavWidget = () => {
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

const SettingsPanelWidget = () => (
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

// ===== Features Widgets =====
const FeatureFlagsWidget = () => (
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
                                灰度 {flag.rollout}%
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

const QuickActionsWidget = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', height: '100%' }}>
        {[
            { icon: <Navigation size={14} />, label: '導航' },
            { icon: <Package size={14} />, label: '派遣' },
            { icon: <AlertTriangle size={14} />, label: '通報' },
        ].map((action, i) => (
            <button key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(195, 155, 111, 0.15)',
                border: '1px solid rgba(195, 155, 111, 0.3)',
                borderRadius: '6px',
                color: 'var(--accent-gold)',
                fontSize: '12px',
                cursor: 'pointer',
            }}>
                {action.icon}
                {action.label}
            </button>
        ))}
    </div>
);

// ===== Export Widget Content Map =====
export const WIDGET_CONTENT_MAP: Record<string, React.ReactNode> = {
    // Tactical Map
    'map-layers': <MapLayersWidget />,
    'tactical-map': <TacticalMapWidget />,
    'map-legend': <MapLegendWidget />,
    'quick-actions': <QuickActionsWidget />,

    // Resource Matching
    'key-metrics': <KeyMetricsWidget />,
    'ai-matches': <AIMatchesWidget />,
    'requests-list': <RequestsListWidget />,
    'supplies-grid': <SuppliesGridWidget />,

    // Reunification
    'search-panel': <SearchPanelWidget />,
    'missing-cases': <MissingCasesWidget />,

    // AI Summary
    'trends-chart': <TrendsChartWidget />,
    'ai-reports': <AIReportsWidget />,

    // Audit
    'audit-table': <AuditTableWidget />,

    // Accounts
    'accounts-grid': <AccountsGridWidget />,

    // Tenants
    'tenant-list': <TenantListWidget />,
    'tenant-detail': <TenantDetailWidget />,

    // Settings
    'settings-nav': <SettingsNavWidget />,
    'settings-panel': <SettingsPanelWidget />,

    // Features
    'feature-flags': <FeatureFlagsWidget />,

    // Default placeholders from original AppShellLayout
    'workspace': (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
            [M-W] 地圖內容區
        </div>
    ),
    'event-timeline': (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
            <CardPlaceholder title="事件 1" />
            <CardPlaceholder title="事件 2" />
            <CardPlaceholder title="事件 3" />
        </div>
    ),
    'disaster-reports': (
        <div>
            <CardPlaceholder title="災情通報 1" />
            <CardPlaceholder title="災情通報 2" />
        </div>
    ),
    'ncdr-alerts': (
        <div>
            <CardPlaceholder title="NCDR 警報 1" />
            <CardPlaceholder title="NCDR 警報 2" />
        </div>
    ),
};
