/**
 * widgets/ai/AiWidgets.tsx
 *
 * AI & analytics hub: task list, predictions, suggestions, reports, trends.
 */
import { Brain } from 'lucide-react';
import { AiIcon, InfoIcon, ExportIcon } from '../../../design-system/icons';

export const AICommandWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '13px', color: '#A855F7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Brain size={16} />
            AI 指揮輔助
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', borderLeft: '3px solid #A855F7' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#A855F7', marginBottom: '4px' }}>建議行動</div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>建議增派 2 組志工前往信義區支援淹水災情。</div>
            </div>
            <button style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '6px',
                color: '#A855F7',
                fontSize: '12px',
                cursor: 'pointer',
            }}>
                執行建議
            </button>
        </div>
    </div>
);

export const AITaskListWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>執行中的 AI 任務</div>
        {[
            { name: '事件分類', status: 'running', progress: 75 },
            { name: '資源配對', status: 'queued', progress: 0 },
            { name: '趨勢預測', status: 'completed', progress: 100 },
        ].map((t, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{t.name}</span>
                    <span style={{ fontSize: '10px', color: t.status === 'running' ? '#3b82f6' : t.status === 'completed' ? '#22c55e' : '#94A3B8' }}>{t.status === 'running' ? '執行中' : t.status === 'completed' ? '完成' : '等待中'}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.progress}%`, background: t.status === 'completed' ? '#22c55e' : '#3b82f6', transition: 'width 0.3s' }} />
                </div>
            </div>
        ))}
    </div>
);

export const AIPredictionWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <div style={{ fontSize: '12px', color: '#A855F7', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AiIcon size={14} aria-hidden="true" />
            趨勢預測
        </div>
        <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>未來 24 小時預測</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>降雨機率：80%、預估任務量：+25%</div>
        </div>
    </div>
);

export const AISuggestionsWidget = () => (
    <div style={{ height: '100%', padding: '12px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: '#A855F7', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <InfoIcon size={14} aria-hidden="true" />
            智慧建議
        </div>
        {[
            { suggestion: '建議增派物資至信義區', priority: 'high' },
            { suggestion: '預警：松山區可能出現交通壅塞', priority: 'medium' },
        ].map((s, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', borderLeft: `3px solid ${s.priority === 'high' ? '#ef4444' : '#eab308'}` }}>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{s.suggestion}</div>
            </div>
        ))}
    </div>
);

export const AIReportsWidget = () => (
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
                    <span className="u-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{report.time}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>{report.title}</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>
                    <Brain size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    信心度: <span className="u-mono">{report.confidence}%</span>
                </div>
            </div>
        ))}
    </div>
);

export const TrendsChartWidget = () => (
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
                <div className="u-mono" style={{ fontSize: '24px', fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.prediction}</div>
            </div>
        ))}
    </div>
);

export const DashboardStatsWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {[
            { label: '今日任務', value: '156', color: '#C39B6F' },
            { label: '進行中', value: '42', color: '#3b82f6' },
            { label: '已完成', value: '108', color: '#22c55e' },
            { label: '待處理', value: '6', color: '#f97316' },
        ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
                <div className="u-mono" style={{ fontSize: '24px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.label}</div>
            </div>
        ))}
    </div>
);

export const ReportGeneratorWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ExportIcon size={14} aria-hidden="true" />
            報表生成
        </div>
        <select style={{ padding: '8px', marginBottom: '8px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
            <option>日報表</option>
            <option>週報表</option>
            <option>月報表</option>
        </select>
        <button style={{ padding: '10px', background: 'var(--accent-gold)', border: 'none', borderRadius: '6px', color: '#1a1f2e', fontWeight: 600, fontSize: '12px', cursor: 'pointer', marginTop: 'auto' }}>
            生成報表
        </button>
    </div>
);

export const ScheduledReportsWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        {[
            { name: '每日任務摘要', schedule: '每日 18:00', next: '今日 18:00' },
            { name: '週志工服務時數', schedule: '每週一 09:00', next: '週一 09:00' },
        ].map((r, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</div>
                <div className="u-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{r.schedule} → 下次: {r.next}</div>
            </div>
        ))}
    </div>
);
