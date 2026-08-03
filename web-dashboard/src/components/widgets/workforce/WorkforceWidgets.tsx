/**
 * widgets/workforce/WorkforceWidgets.tsx
 *
 * Workforce domain: volunteer/personnel rosters, shift calendar, leaderboard.
 */
import { DotStamp } from '../../../design-system/icons/pictograms';

export const VolunteerGridWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {['林志明', '王美玲', '陳大同', '李小華', '張志強'].map((name, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(195, 155, 111, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-gold)',
                        fontWeight: 600,
                    }}>{name.charAt(0)}</div>
                    <div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DotStamp size={8} /> 在線
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const PersonnelGridWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {['林志明', '王美玲', '陳大同', '李小華', '張志強', '黃雅婷'].map((name, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(195, 155, 111, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-gold)',
                        fontWeight: 600,
                    }}>{name.charAt(0)}</div>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {['幹部', '志工', '理事', '志工', '常務理事', '志工'][i]}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const PersonnelStatsWidget = () => (
    <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>人員統計</div>
        {[
            { label: '總人數', value: 156, color: '#C39B6F' },
            { label: '幹部', value: 12, color: '#3B82F6' },
            { label: '志工', value: 144, color: '#22c55e' },
        ].map((stat, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                textAlign: 'center',
            }}>
                <div className="u-mono" style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
            </div>
        ))}
    </div>
);

export const CalendarViewWidget = () => (
    <div style={{ height: '100%', padding: '16px' }}>
        <div style={{ fontSize: '16px', color: 'var(--accent-gold)', marginBottom: '16px', textAlign: 'center' }}>2026 年 1 月</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '12px' }}>
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} style={{ color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className="u-mono" style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: i === 11 ? 'var(--accent-gold)' : [4, 5, 11, 12, 18, 19, 25, 26].includes(i) ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    color: i === 11 ? '#0B1120' : [4, 5, 11, 12, 18, 19, 25, 26].includes(i) ? '#22c55e' : 'var(--text-secondary)',
                    textAlign: 'center',
                    cursor: 'pointer',
                }}>{i + 1}</div>
            ))}
        </div>
    </div>
);

export const ShiftSummaryWidget = () => (
    <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>排班統計</div>
        {[
            { label: '本月班次', value: '8 班' },
            { label: '總時數', value: '48 小時' },
            { label: '待確認', value: '2 班' },
        ].map((stat, i) => (
            <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                marginBottom: '6px',
            }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.label}</span>
                <span className="u-mono" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{stat.value}</span>
            </div>
        ))}
    </div>
);

export const MyShiftsWidget = () => (
    <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>我的班表</div>
        {['1/12 (日) 08:00-16:00', '1/13 (一) 16:00-00:00'].map((shift, i) => (
            <div key={i} className="u-mono" style={{
                padding: '10px',
                background: i === 0 ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                marginBottom: '6px',
                fontSize: '12px',
                color: 'var(--text-primary)',
            }}>
                {shift}
            </div>
        ))}
    </div>
);

export const TopVolunteersWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { rank: 1, name: '林志明', points: 2450 },
            { rank: 2, name: '王美玲', points: 2180 },
            { rank: 3, name: '陳大同', points: 1920 },
        ].map((v, i) => (
            <div key={i} style={{
                padding: '16px',
                background: i === 0 ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
            }}>
                <span className="u-mono" style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: i === 0 ? '#C39B6F' : i === 1 ? '#94A3B8' : '#CD7F32',
                }}>#{v.rank}</span>
                <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-primary)' }}>{v.name}</span>
                <span className="u-mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-gold)' }}>{v.points} pts</span>
            </div>
        ))}
    </div>
);

export const MyRankingWidget = () => (
    <div style={{ padding: '16px', textAlign: 'center' }}>
        <div className="u-mono" style={{ fontSize: '48px', fontWeight: 700, color: 'var(--accent-gold)' }}>15</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>目前排名</div>
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
            <div className="u-mono" style={{ fontSize: '24px', fontWeight: 600, color: '#22c55e' }}>850</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>累積積分</div>
        </div>
    </div>
);
