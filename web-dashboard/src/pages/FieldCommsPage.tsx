/**
 * FieldCommsPage.tsx
 * 
 * 現地通訊頁面 - 無線電/弱網/衛星備援
 */
import React from 'react';

export default function FieldCommsPage() {
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
                📻 現地通訊
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                無線電通訊、弱網環境、衛星備援通訊管理
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
            }}>
                {/* 通訊頻道狀態 */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>5/5</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>通訊頻道在線</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛰️</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)' }}>備用</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>衛星通訊狀態</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📶</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>85%</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mesh 網路覆蓋</div>
                </div>
            </div>
        </div>
    );
}
