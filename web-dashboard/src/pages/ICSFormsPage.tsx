/**
 * ICSFormsPage.tsx
 * 
 * ICS表單目錄頁面 - 顯示所有可用的ICS表單
 */
import React from 'react';
import { Link } from 'react-router-dom';

const ICS_FORMS = [
    { id: '201', name: 'ICS 201 - 事件簡報', description: '初始事件簡報、資源概況、組織圖', path: '/ics/201', status: '可用' },
    { id: '202', name: 'ICS 202 - 事件目標', description: '行動週期目標設定', path: '/ics', status: '開發中' },
    { id: '203', name: 'ICS 203 - 組織架構圖', description: '指揮架構及人員配置', path: '/ics', status: '開發中' },
    { id: '204', name: 'ICS 204 - 任務分派', description: '各分組任務指派', path: '/ics', status: '開發中' },
    { id: '205', name: 'ICS 205 - 通訊計畫', description: '無線電頻道、呼號分配', path: '/ics/205', status: '可用' },
    { id: '206', name: 'ICS 206 - 醫療計畫', description: '醫療資源及後送路線', path: '/ics', status: '開發中' },
    { id: '207', name: 'ICS 207 - 組織架構圖', description: '事件組織圖', path: '/ics', status: '開發中' },
    { id: '208', name: 'ICS 208 - 安全信息', description: '現場安全注意事項', path: '/ics', status: '開發中' },
    { id: '209', name: 'ICS 209 - 狀況摘要', description: '事件綜合狀況報告', path: '/ics', status: '開發中' },
    { id: '214', name: 'ICS 214 - 活動日誌', description: '單元/人員活動記錄', path: '/ics', status: '開發中' },
];

export default function ICSFormsPage() {
    return (
        <div style={{
            padding: '24px',
            color: 'var(--text-primary)',
        }}>
            <h1 style={{
                fontSize: '24px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--accent-gold)',
            }}>
                📋 ICS 表單
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                事件指揮系統標準表單 (Incident Command System Forms)
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
            }}>
                {ICS_FORMS.map((form) => (
                    <Link
                        key={form.id}
                        to={form.path}
                        style={{
                            padding: '20px',
                            background: 'rgba(47, 54, 65, 0.5)',
                            borderRadius: '12px',
                            border: form.status === '可用' 
                                ? '1px solid rgba(195, 155, 111, 0.4)' 
                                : '1px solid rgba(100, 100, 100, 0.3)',
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'block',
                            transition: 'all 0.2s',
                            opacity: form.status === '可用' ? 1 : 0.6,
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '8px',
                        }}>
                            <span style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: form.status === '可用' ? 'var(--accent-gold)' : 'var(--text-muted)',
                            }}>
                                {form.name}
                            </span>
                            <span style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: form.status === '可用' ? '#22c55e' : '#6b7280',
                                color: 'white',
                            }}>
                                {form.status}
                            </span>
                        </div>
                        <p style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            margin: 0,
                        }}>
                            {form.description}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
