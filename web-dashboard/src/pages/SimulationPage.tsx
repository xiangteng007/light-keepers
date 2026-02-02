/**
 * SimulationPage.tsx
 * 
 * 模擬引擎頁面 - 災害模擬與推演
 */
import React from 'react';

export default function SimulationPage() {
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
                🧪 模擬引擎
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                災害情境模擬、桌上推演、能力評核
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
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌊</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-gold)' }}>水災模擬</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>淹水範圍預估</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏔️</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-gold)' }}>土石流模擬</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>潛勢區預警</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-gold)' }}>地震模擬</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>結構損壞評估</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-gold)' }}>桌上推演</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>情境演練設計</div>
                </div>
            </div>
        </div>
    );
}
