/**
 * UnifiedReportingPage.tsx
 * 
 * 綜合報表頁面 - 跨領域報表生成
 */
import React from 'react';

export default function UnifiedReportingPage() {
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
                📊 綜合報表
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                跨領域整合報表、SITREP、事件摘要
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
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)' }}>24</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>本月報表</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>3</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SITREP 進行中</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>8</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AAR 已完成</div>
                </div>
            </div>
        </div>
    );
}
