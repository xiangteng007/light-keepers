/**
 * widgets/resources/ResourceWidgets.tsx
 *
 * Logistics domain: matching, requests, supplies, equipment, donations, approvals.
 */
import { Zap, GitMerge, Package } from 'lucide-react';
import { ListItem, MetricCard } from '../shared/primitives';

export const AIMatchesWidget = () => (
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
                <div className="u-mono" style={{
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
                        {match.to} · <span className="u-mono">{match.distance}</span>
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

export const RequestsListWidget = () => (
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

export const SuppliesGridWidget = () => (
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
                    <div className="u-mono" style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{supply.available}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{supply.type}</div>
                </div>
            ))}
        </div>
    </div>
);

export const ResourceCategoriesWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>資源分類</div>
        {['飲水食品', '醫療用品', '照明設備', '通訊器材', '帳篷睡袋'].map((cat, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{cat}</span>
                <span className="u-mono" style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                }}>{Math.floor(Math.random() * 500 + 100)}</span>
            </div>
        ))}
    </div>
);

export const DonationListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { donor: '匿名善心人', amount: 10000, time: '今天' },
            { donor: '王先生', amount: 5000, time: '昨天' },
        ].map((d, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{d.donor}</span>
                    <span className="u-mono" style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>NT$ {d.amount.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{d.time}</div>
            </div>
        ))}
    </div>
);

export const ApprovalQueueWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {['志工申請 - 林先生', '物資領用 - 急救站', '權限申請 - 陳小姐'].map((item, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{item}</span>
                <button style={{
                    padding: '6px 12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '6px',
                    color: '#22c55e',
                    fontSize: '11px',
                    cursor: 'pointer',
                }}>審核</button>
            </div>
        ))}
    </div>
);

export const EquipmentStatsWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <MetricCard label="總裝備數" value={256} color="#C39B6F" />
        <MetricCard label="已借出" value={45} color="#3B82F6" />
        <MetricCard label="待維修" value={8} color="#ef4444" />
        <MetricCard label="可用" value={203} color="#22c55e" />
    </div>
);

export const EquipmentScannerWidget = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{
            width: '150px',
            height: '150px',
            border: '2px dashed var(--accent-gold)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
        }}>
            <span style={{ fontSize: '48px' }}>📷</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            掃描 QR Code 或輸入裝備編號
        </div>
        <input type="text" placeholder="輸入編號..." style={{
            marginTop: '12px',
            padding: '10px 16px',
            background: 'rgba(47, 54, 65, 0.5)',
            border: '1px solid rgba(195, 155, 111, 0.2)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            width: '100%',
            maxWidth: '200px',
        }} />
    </div>
);

export const EquipmentGridWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {['發電機', '對講機', '帳篷', '急救箱', '照明燈', '繩索'].map((item, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {['⚡', '📻', '⛺', '🩹', '💡', '🪢'][i]}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        可用: <span className="u-mono">{Math.floor(Math.random() * 20 + 5)}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);
