/**
 * widgets/community/CommunityWidgets.tsx
 *
 * Community & wellbeing: blessing wall, activities, social feed,
 * mood tracking and mental-health screening, reunification cases.
 */
import { useTranslation } from 'react-i18next';
import { Users, MapPin } from 'lucide-react';

export const SocialFeedWidget = () => {
    const { t } = useTranslation();
    return (
        <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--accent-gold)', fontWeight: 600 }}>社群情資</div>
                <span style={{ fontSize: '11px', color: '#22c55e' }}>● Live</span>
            </div>
            {[
                { platform: 'Facebook', content: '信義區積水嚴重，車輛無法通行...', time: '2m ago', urgency: 'high' },
                { platform: 'Threads', content: '有人受困在地下室，請求支援！', time: '5m ago', urgency: 'critical' },
                { platform: 'PTT', content: '目前風雨變大，請大家小心', time: '12m ago', urgency: 'low' },
            ].map((post, i) => (
                <div key={i} style={{
                    padding: '12px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: `3px solid ${post.urgency === 'critical' ? '#ef4444' : post.urgency === 'high' ? '#f97316' : '#22c55e'}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{post.platform}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{post.time}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{post.content}</div>
                </div>
            ))}
        </div>
    );
};

export const BlessingWallWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {['🕯️ 平安順利', '🙏 祈求平安', '❤️ 加油'].map((msg, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(195, 155, 111, 0.1)',
                borderRadius: '8px',
                marginBottom: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
            }}>{msg}</div>
        ))}
    </div>
);

export const ActivityFeedWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {['社區防災演練', '志工培訓日', '捐血活動'].map((act, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
            }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{act}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>下週六 10:00</div>
            </div>
        ))}
    </div>
);

export const ActivityCalendarWidget = () => (
    <div style={{ padding: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: 'var(--accent-gold)', marginBottom: '16px' }}>2026 年 1 月</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '11px' }}>
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} style={{ color: 'var(--text-muted)', padding: '8px' }}>{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
                <div key={i} style={{
                    padding: '8px',
                    borderRadius: '4px',
                    background: i === 11 ? 'var(--accent-gold)' : 'transparent',
                    color: i === 11 ? '#0B1120' : 'var(--text-secondary)',
                }}>{i + 1}</div>
            ))}
        </div>
    </div>
);

export const MissingCasesWidget = () => (
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

export const MoodTrackerWidget = () => (
    <div style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '20px', fontWeight: 600 }}>今天感覺如何？</div>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😐</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '200px', marginBottom: '16px' }}>
            <span>1</span>
            <input type="range" min="1" max="10" defaultValue="5" style={{ flex: 1 }} />
            <span>10</span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>5 / 10</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {['放鬆', '忙碌', '疲倦', '焦慮', '開心'].map((tag, i) => (
                <span key={i} style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: i === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(47, 54, 65, 0.5)',
                    border: i === 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(195, 155, 111, 0.2)',
                    color: i === 0 ? '#22c55e' : 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                }}>{tag}</span>
            ))}
        </div>
        <button style={{
            marginTop: '20px',
            padding: '10px 24px',
            background: 'rgba(195, 155, 111, 0.9)',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer',
        }}>記錄心情</button>
    </div>
);

export const Phq9AssessmentWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px', fontWeight: 600 }}>
            憂鬱症篩檢 (PHQ-9)
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            過去兩週內，您有多常受到以下問題困擾？
        </div>
        {['對事物缺乏興趣', '感到沮喪或絕望', '睡眠問題'].map((q, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
            }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>{i + 1}. {q}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['完全沒有', '幾天', '超過一半', '幾乎每天'].map((opt, j) => (
                        <span key={j} style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: j === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(47, 54, 65, 0.5)',
                            color: j === 0 ? '#22c55e' : 'var(--text-muted)',
                            fontSize: '11px',
                            cursor: 'pointer',
                        }}>{opt}</span>
                    ))}
                </div>
            </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button style={{
                padding: '10px 24px',
                background: 'rgba(59, 130, 246, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
            }}>開始評估</button>
        </div>
    </div>
);

export const Gad7AssessmentWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px', fontWeight: 600 }}>
            焦慮症篩檢 (GAD-7)
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            過去兩週內，您有多常受到以下問題困擾？
        </div>
        {['感到緊張或焦慮', '無法控制擔心', '過度擔心各種事情'].map((q, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
            }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>{i + 1}. {q}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['完全沒有', '幾天', '超過一半', '幾乎每天'].map((opt, j) => (
                        <span key={j} style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: j === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(47, 54, 65, 0.5)',
                            color: j === 0 ? '#22c55e' : 'var(--text-muted)',
                            fontSize: '11px',
                            cursor: 'pointer',
                        }}>{opt}</span>
                    ))}
                </div>
            </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button style={{
                padding: '10px 24px',
                background: 'rgba(168, 85, 247, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
            }}>開始評估</button>
        </div>
    </div>
);
