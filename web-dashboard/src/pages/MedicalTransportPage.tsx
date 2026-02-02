/**
 * MedicalTransportPage.tsx
 * 
 * 醫療後送頁面 - MCI/檢傷/後送管理
 */
import React from 'react';

export default function MedicalTransportPage() {
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
                🚑 醫療後送
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                大量傷患事件處理、檢傷分類、後送調度
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
            }}>
                {/* 檢傷統計 */}
                <div style={{
                    padding: '16px',
                    background: '#dc2626',
                    borderRadius: '12px',
                    color: 'white',
                }}>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>🔴 紅色-危急</div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>2</div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#f97316',
                    borderRadius: '12px',
                    color: 'white',
                }}>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>🟠 黃色-中傷</div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>5</div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#22c55e',
                    borderRadius: '12px',
                    color: 'white',
                }}>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>🟢 綠色-輕傷</div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>15</div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#374151',
                    borderRadius: '12px',
                    color: 'white',
                }}>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>⚫ 黑色-不治</div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>0</div>
                </div>
            </div>
        </div>
    );
}
