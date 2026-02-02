/**
 * UnifiedResourcesPage.tsx
 * 
 * 資源整合頁面 - 跨組織資源協調
 */
import React from 'react';

export default function UnifiedResourcesPage() {
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
                🔗 資源整合
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                跨組織物資協調、資源共享、整合調度
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
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)' }}>6</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>合作組織</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>1,240</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>共享物資項</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚚</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>15</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>調撥進行中</div>
                </div>
            </div>
        </div>
    );
}
