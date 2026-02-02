/**
 * SearchRescuePage.tsx
 * 
 * 搜救任務管理頁面 - 山搜/水域/城市倒塌搜救
 */
import React from 'react';

export default function SearchRescuePage() {
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
                🔍 搜救任務
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                山搜、水域、城市倒塌結構救援任務管理
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
            }}>
                {/* 進行中任務 */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏔️</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)' }}>3</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>進行中任務</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>24</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>出勤人員</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>12</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>已救援</div>
                </div>
            </div>
        </div>
    );
}
