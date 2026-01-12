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
    Shield, Mail, Phone, Calendar, Database, Activity, GitMerge, Home, Percent,
    MessageSquare, Cloud, Radio, Cpu, CloudRain
}
    from 'lucide-react';

// ===== Phase 10: Hub Widgets (New) =====

const SocialFeedWidget = () => (
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

const WeatherAlertWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CloudRain size={24} style={{ color: '#3B82F6' }} />
            <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>豪雨特報</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>台北市, 新北市</div>
            </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>雨量</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#3B82F6' }}>120mm</div>
            </div>
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>風速</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>6級</div>
            </div>
        </div>
    </div>
);

const NotificationCenterWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '8px', fontWeight: 600 }}>通知中心</div>
        {[
            { title: '系統公告', body: '將於今晚進行系統維護', time: '10:00' },
            { title: '任務更新', body: '任務 #1234 已完成', time: '09:45' },
        ].map((notif, i) => (
            <div key={i} style={{
                padding: '10px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                marginBottom: '6px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{notif.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{notif.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{notif.body}</div>
            </div>
        ))}
    </div>
);

const AICommandWidget = () => (
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

// ===== Phase 11: Hub Page Widgets =====

// Notification Hub Widgets
const NotificationFeedWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { type: 'LINE', title: '任務觸發通知', body: '您已被指派至信義區支援任務', time: '10:32', read: false },
            { type: 'Push', title: '系統公告', body: '今晚 00:00-06:00 進行系統維護', time: '09:15', read: true },
            { type: 'Telegram', title: '警報轉發', body: 'NCDR 豪雨特報已更新', time: '08:45', read: true },
        ].map((n, i) => (
            <div key={i} style={{
                padding: '12px', marginBottom: '8px', background: n.read ? 'rgba(47, 54, 65, 0.2)' : 'rgba(195, 155, 111, 0.1)',
                borderRadius: '8px', borderLeft: `3px solid ${n.read ? '#64748b' : '#C39B6F'}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px' }}>{n.type} • {n.time}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.body}</div>
            </div>
        ))}
    </div>
);

const NotificationSummaryWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {[
            { label: '今日通知', value: '47', color: '#C39B6F' },
            { label: '未讀', value: '8', color: '#F97316' },
            { label: 'LINE', value: '32', color: '#00C300' },
            { label: 'Push', value: '15', color: '#3B82F6' },
        ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.label}</div>
            </div>
        ))}
    </div>
);

const ChannelStatusWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>頻道連線狀態</div>
        {[
            { name: 'LINE Messaging', status: 'online' },
            { name: 'Telegram Bot', status: 'online' },
            { name: 'Web Push', status: 'online' },
            { name: 'Slack Webhook', status: 'offline' },
        ].map((ch, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{ch.name}</span>
                <span style={{ fontSize: '11px', color: ch.status === 'online' ? '#22c55e' : '#ef4444' }}>● {ch.status === 'online' ? '連線中' : '離線'}</span>
            </div>
        ))}
    </div>
);

// Geo-Intel Hub Widgets
const GeoAlertFeedWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { source: 'NCDR', alert: '豪雨特報', region: '台北市、新北市', level: 'high', time: '10:00' },
            { source: '氣象局', alert: '強風特報', region: '桃園市沿海', level: 'medium', time: '09:30' },
            { source: '社群', alert: '淹水通報', region: '信義區松仁路', level: 'critical', time: '09:15' },
        ].map((a, i) => (
            <div key={i} style={{
                padding: '12px', marginBottom: '8px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '8px',
                borderLeft: `3px solid ${a.level === 'critical' ? '#ef4444' : a.level === 'high' ? '#f97316' : '#eab308'}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.alert}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.source} • {a.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>📍 {a.region}</div>
            </div>
        ))}
    </div>
);

const GeoSummaryWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {[
            { label: '警報總數', value: '12', color: '#ef4444' },
            { label: 'NCDR', value: '5', color: '#f97316' },
            { label: '氣象局', value: '4', color: '#3b82f6' },
            { label: '社群情資', value: '3', color: '#22c55e' },
        ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.label}</div>
            </div>
        ))}
    </div>
);

const EarthquakeMonitorWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌋</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>目前無地震</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>最後更新: 10:30</div>
    </div>
);

// Analytics Hub Widgets
const DashboardStatsWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {[
            { label: '今日任務', value: '156', color: '#C39B6F' },
            { label: '進行中', value: '42', color: '#3b82f6' },
            { label: '已完成', value: '108', color: '#22c55e' },
            { label: '待處理', value: '6', color: '#f97316' },
        ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.label}</div>
            </div>
        ))}
    </div>
);

const ReportGeneratorWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>📄 報表生成</div>
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

const ScheduledReportsWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        {[
            { name: '每日任務摘要', schedule: '每日 18:00', next: '今日 18:00' },
            { name: '週志工服務時數', schedule: '每週一 09:00', next: '週一 09:00' },
        ].map((r, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{r.schedule} → 下次: {r.next}</div>
            </div>
        ))}
    </div>
);

// AI Hub Widgets
const AITaskListWidget = () => (
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

const AIPredictionWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <div style={{ fontSize: '12px', color: '#A855F7', marginBottom: '10px' }}>🔮 趨勢預測</div>
        <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>未來 24 小時預測</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>降雨機率：80%、預估任務量：+25%</div>
        </div>
    </div>
);

const AISuggestionsWidget = () => (
    <div style={{ height: '100%', padding: '12px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: '#A855F7', marginBottom: '10px' }}>💡 智慧建議</div>
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

// Offline Hub Widgets
const SyncStatusWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>● 上線</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>網路狀態</div>
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#C39B6F' }}>3</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>待同步</div>
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>10:35</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>最後同步</div>
        </div>
    </div>
);

const PendingQueueWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>待同步操作</div>
        {[
            { action: '新增通報 #1234', time: '10:32', size: '1.2KB' },
            { action: '更新任務狀態', time: '10:30', size: '0.5KB' },
            { action: '上傳照片', time: '10:28', size: '3.4MB' },
        ].map((q, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{q.action}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{q.time}</div>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{q.size}</span>
            </div>
        ))}
    </div>
);

const MeshNetworkWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>P2P 網路</div>
        <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>2 個節點連線中</div>
    </div>
);

// Intake Widgets
const IntakeFormWidget = () => (
    <div style={{ height: '100%', padding: '16px', overflow: 'auto' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '16px' }}>📝 災情通報表單</div>
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>災情類型</label>
            <select style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
                <option>淹水</option>
                <option>土石流</option>
                <option>建物倒塌</option>
                <option>其他</option>
            </select>
        </div>
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>地點描述</label>
            <input type="text" placeholder="請輸入地點" style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>災情描述</label>
            <textarea placeholder="請描述災情狀況..." rows={4} style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', resize: 'none' }} />
        </div>
        <button style={{ width: '100%', padding: '12px', background: 'var(--accent-gold)', border: 'none', borderRadius: '6px', color: '#1a1f2e', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            送出通報
        </button>
    </div>
);

const IntakeTipsWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>💡 通報提示</div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>請盡量提供精確的地址或GPS座標</li>
            <li>拍照時請注意自身安全</li>
            <li>若有人員受困，請同時撥打119</li>
            <li>通報後請保持手機暢通</li>
        </ul>
    </div>
);

const RecentIntakesWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>近期通報</div>
        {[
            { id: '#1234', type: '淹水', location: '信義區', time: '10:30' },
            { id: '#1233', type: '土石流', location: '北投區', time: '10:15' },
        ].map((r, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{r.id} {r.type}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>📍 {r.location}</div>
            </div>
        ))}
    </div>
);

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

    // ===== Additional Widget Placeholders =====

    // Analytics
    'mission-stats': <KeyMetricsWidget />,

    // Hub Widgets
    'social-feed': <SocialFeedWidget />,
    'weather-alert': <WeatherAlertWidget />,
    'notification-center': <NotificationCenterWidget />,
    'ai-command': <AICommandWidget />,

    // Hub: Notification
    'notification-feed': <NotificationFeedWidget />,
    'notification-summary': <NotificationSummaryWidget />,
    'channel-status': <ChannelStatusWidget />,

    // Hub: Geo-Intel
    'geo-alert-feed': <GeoAlertFeedWidget />,
    'geo-summary': <GeoSummaryWidget />,
    'earthquake-monitor': <EarthquakeMonitorWidget />,
    'weather-card': <WeatherAlertWidget />,
    // 'weather-radar': <WeatherAlertWidget />,  // Reuse weather widget for radar
    // 'forecast-cards': <WeatherAlertWidget />, // Reuse for forecast
    // Hub: Analytics
    'dashboard-stats': <DashboardStatsWidget />,
    'report-generator': <ReportGeneratorWidget />,
    'scheduled-reports': <ScheduledReportsWidget />,

    // Hub: AI
    'ai-task-list': <AITaskListWidget />,
    'ai-prediction': <AIPredictionWidget />,
    'ai-suggestions': <AISuggestionsWidget />,

    // Hub: Offline
    'sync-status': <SyncStatusWidget />,
    'pending-queue': <PendingQueueWidget />,
    'mesh-network': <MeshNetworkWidget />,

    // Intake
    'intake-form': <IntakeFormWidget />,
    'intake-tips': <IntakeTipsWidget />,
    'recent-intakes': <RecentIntakesWidget />,


    // Volunteers
    'volunteer-grid': (
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
                            <div style={{ fontSize: '11px', color: '#22c55e' }}>● 在線</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ),

    // Notifications
    'notification-list': (
        <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
            {[
                { title: '新任務指派', time: '5 分鐘前', type: 'task' },
                { title: '系統維護通知', time: '1 小時前', type: 'system' },
                { title: 'NCDR 警報', time: '2 小時前', type: 'alert' },
            ].map((notif, i) => (
                <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{notif.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{notif.time}</div>
                </div>
            ))}
        </div>
    ),
    'notification-settings': (
        <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px' }}>通知偏好</div>
            {['Email', 'LINE', '推播'].map((type, i) => (
                <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(47, 54, 65, 0.5)',
                }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{type}</span>
                    <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: i === 0 ? '#22c55e' : 'rgba(47, 54, 65, 0.5)', cursor: 'pointer' }} />
                </div>
            ))}
        </div>
    ),

    // Events
    'event-list': (
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
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{event.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{event.location}</div>
                </div>
            ))}
        </div>
    ),

    // Training
    'training-progress': (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
            <MetricCard label="已完成" value="8" color="#22c55e" />
            <MetricCard label="進行中" value="2" color="#3B82F6" />
            <MetricCard label="待開始" value="4" color="#94A3B8" />
            <MetricCard label="完成率" value="60%" trend="up" color="#C39B6F" />
        </div>
    ),
    'course-grid': (
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{course.progress}% 完成</div>
                    </div>
                ))}
            </div>
        </div>
    ),

    // Resources
    'resource-stats': <KeyMetricsWidget />,
    'resource-table': <SuppliesGridWidget />,

    // Tasks
    'task-stats': <KeyMetricsWidget />,
    'task-board': (
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
    ),

    // Incidents
    'incident-map': <TacticalMapWidget />,
    'incident-list': (
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
    ),

    // Community
    'community-stats': <KeyMetricsWidget />,
    'community-map': <TacticalMapWidget />,
    'blessing-wall': (
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
    ),

    // NCDR
    'alert-summary': <KeyMetricsWidget />,

    // Forecast
    'weather-radar': <TacticalMapWidget />,
    'forecast-cards': (
        <div style={{ padding: '8px' }}>
            {[
                { day: '今天', temp: '28°', condition: '☀️ 晴' },
                { day: '明天', temp: '26°', condition: '🌧️ 雨' },
                { day: '後天', temp: '25°', condition: '⛅ 多雲' },
            ].map((f, i) => (
                <div key={i} style={{
                    padding: '12px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f.day}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.temp}</span>
                    <span>{f.condition}</span>
                </div>
            ))}
        </div>
    ),

    // Donations
    'donation-stats': <KeyMetricsWidget />,
    'donation-list': (
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
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>NT$ {d.amount.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{d.time}</div>
                </div>
            ))}
        </div>
    ),

    // Approvals
    'pending-count': <KeyMetricsWidget />,
    'approval-queue': (
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
    ),

    // Activities
    'activity-feed': (
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
    ),
    'activity-calendar': (
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
    ),

    // Leaderboard
    'top-volunteers': (
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
                    <span style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: i === 0 ? '#C39B6F' : i === 1 ? '#94A3B8' : '#CD7F32',
                    }}>#{v.rank}</span>
                    <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-primary)' }}>{v.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-gold)' }}>{v.points} pts</span>
                </div>
            ))}
        </div>
    ),
    'my-ranking': (
        <div style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--accent-gold)' }}>15</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>目前排名</div>
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#22c55e' }}>850</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>累積積分</div>
            </div>
        </div>
    ),

    // Default placeholders from original AppShellLayout
    'workspace': (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
            [M-W] 地圖內容區
        </div>
    ),
    'disaster-reports': (
        <div>
            <CardPlaceholder title="災情通報 1" />
            <CardPlaceholder title="災情通報 2" />
        </div>
    ),

    // Task Dispatch (智慧派遣)
    'dispatch-queue': (
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
                        {task.location} · {task.time}
                    </div>
                </div>
            ))}
        </div>
    ),

    // Triage (分流站)
    'triage-queue': (
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
                    <span style={{
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
    ),
    'triage-stats': (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
            <MetricCard label="待處理" value={10} color="#ef4444" />
            <MetricCard label="處理中" value={5} color="#eab308" />
            <MetricCard label="已完成" value={23} color="#22c55e" />
            <MetricCard label="總計" value={38} color="#C39B6F" />
        </div>
    ),
    'triage-workspace': (
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
    ),

    // Drills (演練模擬)
    'drill-scenarios': (
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
    ),
    'drill-controls': (
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
    ),
    'drill-log': (
        <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div>[10:00:00] 演練開始</div>
                <div>[10:00:15] 地震警報發布</div>
                <div>[10:00:30] 疏散程序啟動</div>
                <div style={{ color: '#22c55e' }}>[10:01:00] 全員撤離完成</div>
            </div>
        </div>
    ),

    // ===== V2 Domain Page Widgets =====

    // Drone Control (無人機作業)
    'drone-list': (
        <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>無人機列表</div>
            {['DJI-01', 'DJI-02', 'Mavic-03'].map((drone, i) => (
                <div key={i} style={{
                    padding: '12px',
                    background: i === 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: i === 0 ? '#22c55e' : i === 1 ? '#eab308' : '#94a3b8',
                    }} />
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{drone}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {i === 0 ? '飛行中 · 電量 78%' : i === 1 ? '待命 · 電量 95%' : '離線'}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    ),
    'drone-controls': (
        <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>飛行控制</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['⬆', '↖', '↗', '⬅', '⏸', '➡', '↙', '⬇', '↘'].map((dir, i) => (
                    <button key={i} style={{
                        padding: '12px',
                        background: i === 4 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(47, 54, 65, 0.5)',
                        border: i === 4 ? '1px solid #ef4444' : '1px solid rgba(195, 155, 111, 0.2)',
                        borderRadius: '8px',
                        color: i === 4 ? '#ef4444' : 'var(--text-primary)',
                        fontSize: '16px',
                        cursor: 'pointer',
                    }}>{dir}</button>
                ))}
            </div>
        </div>
    ),
    'drone-status': (
        <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>狀態監控</div>
            {[
                { label: '高度', value: '120m' },
                { label: '速度', value: '35 km/h' },
                { label: '電量', value: '78%' },
            ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{stat.value}</span>
                </div>
            ))}
        </div>
    ),
    'drone-log': (
        <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div>[14:30:00] DJI-01 起飛</div>
                <div>[14:30:15] 到達指定高度 120m</div>
                <div>[14:32:00] 開始偵察任務</div>
                <div style={{ color: '#3B82F6' }}>[14:35:00] 發現目標區域</div>
            </div>
        </div>
    ),

    // Equipment (裝備標籤)
    'equipment-stats': (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
            <MetricCard label="總裝備數" value={256} color="#C39B6F" />
            <MetricCard label="已借出" value={45} color="#3B82F6" />
            <MetricCard label="待維修" value={8} color="#ef4444" />
            <MetricCard label="可用" value={203} color="#22c55e" />
        </div>
    ),
    'equipment-scanner': (
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
    ),
    'equipment-grid': (
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
                            可用: {Math.floor(Math.random() * 20 + 5)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ),

    // Shift Calendar (排班日曆)
    'calendar-view': (
        <div style={{ height: '100%', padding: '16px' }}>
            <div style={{ fontSize: '16px', color: 'var(--accent-gold)', marginBottom: '16px', textAlign: 'center' }}>2026 年 1 月</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '12px' }}>
                {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} style={{ color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>{d}</div>
                ))}
                {Array.from({ length: 31 }, (_, i) => (
                    <div key={i} style={{
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
    ),
    'shift-summary': (
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
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{stat.value}</span>
                </div>
            ))}
        </div>
    ),
    'my-shifts': (
        <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>我的班表</div>
            {['1/12 (日) 08:00-16:00', '1/13 (一) 16:00-00:00'].map((shift, i) => (
                <div key={i} style={{
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
    ),

    // Resource Overview (資源總覽)
    'resource-categories': (
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
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                    }}>{Math.floor(Math.random() * 500 + 100)}</span>
                </div>
            ))}
        </div>
    ),

    // Personnel (人員管理)
    'personnel-grid': (
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
    ),
    'personnel-stats': (
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
                    <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
                </div>
            ))}
        </div>
    ),

    // ===== Mental Health Widgets =====
    'mood-tracker': (
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
    ),
    'phq9-assessment': (
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
    ),
    'gad7-assessment': (
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
    ),

    // ===== 新增頁面 Widget 內容 =====

    // Report 災情通報
    'report-form': (
        <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '20px', fontWeight: 600 }}>災情通報表單</div>
            {['災情類型', '地點', '影響範圍', '描述'].map((field, i) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{field}</label>
                    {i === 3 ? (
                        <textarea style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.2)', borderRadius: '6px', color: 'var(--text-primary)', minHeight: '100px' }} placeholder={`請輸入${field}...`} />
                    ) : (
                        <input type="text" style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.2)', borderRadius: '6px', color: 'var(--text-primary)' }} placeholder={`請輸入${field}...`} />
                    )}
                </div>
            ))}
            <button style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>🚨 緊急通報</button>
        </div>
    ),
    'recent-reports': (
        <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>近期通報</div>
            {['水災通報 - 信義區', '停電通報 - 中山區', '道路封閉 - 內湖區'].map((report, i) => (
                <div key={i} style={{ padding: '10px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{report}</div>
            ))}
        </div>
    ),

    // Manuals 作業手冊
    'manual-categories': (
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
    ),
    'manual-list': (
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v2.1 • 更新於 3 天前</div>
                    </div>
                ))}
            </div>
        </div>
    ),

    // Permissions 權限管理
    'role-list': (
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
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>Lv.{role.level}</span>
                    </div>
                </div>
            ))}
        </div>
    ),
    'permission-matrix': (
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
                                    {level >= i + 1 ? '✅' : '❌'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ),

    // Backups 備份管理
    'backup-status': (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>✓</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>上次備份成功</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>2h 前</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>最近備份時間</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>45.2 GB</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>總備份大小</div>
            </div>
        </div>
    ),
    'backup-list': (
        <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
            {[
                { name: 'backup_2026-01-12_10-00', size: '5.2 GB', status: 'complete' },
                { name: 'backup_2026-01-11_22-00', size: '5.1 GB', status: 'complete' },
                { name: 'backup_2026-01-11_10-00', size: '5.0 GB', status: 'complete' },
            ].map((backup, i) => (
                <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                }}>
                    <div style={{ fontSize: '16px', marginRight: '12px' }}>💾</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{backup.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{backup.size}</div>
                    </div>
                    <button style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '6px', color: '#3B82F6', fontSize: '11px', cursor: 'pointer' }}>還原</button>
                </div>
            ))}
        </div>
    ),
    'backup-actions': (
        <div style={{ height: '100%', padding: '12px' }}>
            <button style={{ width: '100%', padding: '12px', background: 'rgba(195, 155, 111, 0.9)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer', marginBottom: '12px' }}>立即備份</button>
            <button style={{ width: '100%', padding: '12px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>排程設定</button>
            <div style={{ padding: '12px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>自動備份</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>每 12 小時</span>
                    <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '10px' }}>已啟用</span>
                </div>
            </div>
        </div>
    ),

    // Profile 個人資料
    'profile-card': (
        <div style={{ height: '100%', padding: '16px', textAlign: 'center' }}>
            <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(195, 155, 111, 0.2)', border: '3px solid var(--accent-gold)',
                margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', color: 'var(--accent-gold)',
            }}>👤</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>使用者名稱</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-gold)', marginBottom: '16px' }}>系統擁有者</div>
            <div style={{ padding: '12px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '8px', textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📧 電子郵件</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>user@example.com</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📱 電話</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>0912-345-678</div>
            </div>
        </div>
    ),
    'profile-settings': (
        <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px', fontWeight: 600 }}>帳戶設定</div>
            {['顯示名稱', '電子郵件', '電話號碼'].map((field, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{field}</label>
                    <input type="text" style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.2)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                </div>
            ))}
            <button style={{ padding: '10px 20px', background: 'rgba(195, 155, 111, 0.9)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>儲存變更</button>
        </div>
    ),
    'profile-activity': (
        <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>活動記錄</div>
            {['登入系統', '更新個人資料', '完成任務 #1023', '查看報表'].map((activity, i) => (
                <div key={i} style={{
                    padding: '10px',
                    background: 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                }}>
                    <span>{activity}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{i === 0 ? '剛剛' : `${i * 2}h 前`}</span>
                </div>
            ))}
        </div>
    ),
};
