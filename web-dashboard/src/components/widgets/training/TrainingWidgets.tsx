/**
 * widgets/training/TrainingWidgets.tsx
 *
 * Knowledge domain: training progress, courses and operating manuals.
 */
import { MetricCard } from '../shared/primitives';

export const TrainingProgressWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <MetricCard label="已完成" value="8" color="#22c55e" />
        <MetricCard label="進行中" value="2" color="#3B82F6" />
        <MetricCard label="待開始" value="4" color="#94A3B8" />
        <MetricCard label="完成率" value="60%" trend="up" color="#C39B6F" />
    </div>
);

export const CourseGridWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {[
                { title: 'CPR 急救訓練', progress: 100, status: 'completed' },
                { title: '災害應變基礎', progress: 75, status: 'inprogress' },
                { title: '無線電通訊', progress: 0, status: 'pending' },
            ].map((course, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>{course.title}</div>
                    <div style={{ height: '4px', background: 'rgba(47, 54, 65, 0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${course.progress}%`, height: '100%', background: course.status === 'completed' ? '#22c55e' : '#3B82F6' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}><span className="u-mono">{course.progress}%</span> 完成</div>
                </div>
            ))}
        </div>
    </div>
);

export const ManualCategoriesWidget = () => (
    <div style={{ height: '100%', padding: '8px' }}>
        {['🚒 消防', '🏥 醫療', '🚧 交通', '⚡ 電力', '📡 通訊'].map((cat, i) => (
            <div key={i} style={{
                padding: '12px',
                background: i === 0 ? 'rgba(195, 155, 111, 0.15)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px',
                fontSize: '13px',
                color: i === 0 ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer',
            }}>{cat}</div>
        ))}
    </div>
);

export const ManualListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {['火場救援SOP', '水災應變指南', '地震疏散流程', '停電處置程序'].map((manual, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📘</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>{manual}</div>
                    <div className="u-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v2.1 • 更新於 3 天前</div>
                </div>
            ))}
        </div>
    </div>
);
