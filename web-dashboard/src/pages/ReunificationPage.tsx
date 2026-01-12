/**
 * ReunificationPage.tsx
 * 
 * 家庭團聚頁面 - 失蹤協尋、尋獲通報
 */
import React from 'react';

export default function ReunificationPage() {
    return (
        <div style={{
            padding: '24px',
            color: 'var(--text-primary)',
        }}>
            <h1 style={{
                fontSize: '24px',
                fontWeight: 600,
                marginBottom: '16px',
                color: 'var(--accent-gold)',
            }}>
                🏠 家庭團聚
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                失蹤協尋、尋獲通報、家庭團聚管理
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
            }}>
                {/* 通報案例統計 */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)' }}>12</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>待處理案例</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>48</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>已團聚</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#f97316' }}>5</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>搜尋中</div>
                </div>
            </div>
        </div>
    );
}
