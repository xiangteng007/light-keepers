/**
 * InteroperabilityPage.tsx
 * 
 * 機構互通頁面 - 跨組織資料交換
 */
import React from 'react';

export default function InteroperabilityPage() {
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
                🔄 機構互通
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                OCHA EDXL、EMAP 標準、跨機關資料交換
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
            }}>
                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>4</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>已連接機構</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)' }}>156</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>今日訊息</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>99.2%</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>同步成功率</div>
                </div>
            </div>
        </div>
    );
}
