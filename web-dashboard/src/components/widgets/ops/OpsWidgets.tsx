/**
 * widgets/ops/OpsWidgets.tsx
 *
 * Operations domain: tasks, events, incidents, dispatch, triage, drills.
 */
import { MetricCard } from '../shared/primitives';

export const TaskBoardWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { title: '派遣急救組', status: 'active', priority: 'high' },
            { title: '物資清點', status: 'pending', priority: 'medium' },
            { title: '據點撤收', status: 'completed', priority: 'low' },
        ].map((task, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
                opacity: task.status === 'completed' ? 0.6 : 1,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{task.title}</span>
                    <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: task.status === 'active' ? 'rgba(59, 130, 246, 0.2)' : task.status === 'pending' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: task.status === 'active' ? '#3B82F6' : task.status === 'pending' ? '#eab308' : '#22c55e',
                    }}>
                        {task.status === 'active' ? '進行中' : task.status === 'pending' ? '待處理' : '已完成'}
                    </span>
                </div>
            </div>
        ))}
    </div>
);

export const EventListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { title: '暴雨警報發布', location: '台北市', time: '10:30', severity: 'critical' },
            { title: '土石流警戒', location: '新北市', time: '09:15', severity: 'high' },
            { title: '交通事故', location: '桃園市', time: '08:00', severity: 'medium' },
        ].map((event, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
                borderLeft: `4px solid ${event.severity === 'critical' ? '#ef4444' : event.severity === 'high' ? '#f97316' : '#eab308'}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{event.title}</span>
                    <span className="u-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{event.time}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{event.location}</div>
            </div>
        ))}
    </div>
);

export const IncidentListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {['水災', '火災', '交通事故'].map((type, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
                borderLeft: `4px solid ${i === 0 ? '#3B82F6' : i === 1 ? '#ef4444' : '#eab308'}`,
            }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{type}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>處理中</div>
            </div>
        ))}
    </div>
);

export const DispatchQueueWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>待派遣任務</div>
        {[
            { title: '前進指揮所架設', priority: 'high', location: '信義區', time: '10分鐘前' },
            { title: '物資運送', priority: 'medium', location: '大安區', time: '25分鐘前' },
            { title: '傷患轉送', priority: 'critical', location: '中正區', time: '5分鐘前' },
        ].map((task, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                borderLeft: `3px solid ${task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : '#eab308'}`,
            }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{task.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {task.location} · <span className="u-mono">{task.time}</span>
                </div>
            </div>
        ))}
    </div>
);

export const TriageQueueWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>待分流案件</div>
        {[
            { type: '傷患', count: 3, severity: 'red' },
            { type: '失蹤', count: 5, severity: 'yellow' },
            { type: '受困', count: 2, severity: 'red' },
        ].map((item, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.type}</span>
                <span className="u-mono" style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: item.severity === 'red' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    color: item.severity === 'red' ? '#ef4444' : '#eab308',
                }}>{item.count}</span>
            </div>
        ))}
    </div>
);

export const TriageStatsWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <MetricCard label="待處理" value={10} color="#ef4444" />
        <MetricCard label="處理中" value={5} color="#eab308" />
        <MetricCard label="已完成" value={23} color="#22c55e" />
        <MetricCard label="總計" value={38} color="#C39B6F" />
    </div>
);

export const TriageWorkspaceWidget = () => (
    <div style={{ height: '100%', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px' }}>分流工作區</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {['緊急 (紅)', '急迫 (黃)', '一般 (綠)'].map((zone, i) => (
                <div key={i} style={{
                    padding: '24px',
                    background: i === 0 ? 'rgba(239, 68, 68, 0.1)' : i === 1 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    border: `1px dashed ${i === 0 ? '#ef4444' : i === 1 ? '#eab308' : '#22c55e'}`,
                    textAlign: 'center',
                    color: i === 0 ? '#ef4444' : i === 1 ? '#eab308' : '#22c55e',
                    fontSize: '13px',
                }}>
                    {zone}
                </div>
            ))}
        </div>
    </div>
);

export const DrillScenariosWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>演練情境</div>
        {['地震應變演練', '颱風疏散演練', '火災逃生演練', '複合式災害'].map((drill, i) => (
            <div key={i} style={{
                padding: '12px',
                background: i === 0 ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                border: i === 0 ? '1px solid rgba(195, 155, 111, 0.3)' : '1px solid transparent',
            }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{drill}</div>
            </div>
        ))}
    </div>
);

export const DrillControlsWidget = () => (
    <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '16px' }}>演練控制</div>
        <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            color: '#22c55e',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '8px',
        }}>▶ 開始演練</button>
        <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '14px',
            cursor: 'pointer',
        }}>⏹ 停止</button>
    </div>
);

export const DrillLogWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div>[10:00:00] 演練開始</div>
            <div>[10:00:15] 地震警報發布</div>
            <div>[10:00:30] 疏散程序啟動</div>
            <div style={{ color: '#22c55e' }}>[10:01:00] 全員撤離完成</div>
        </div>
    </div>
);
