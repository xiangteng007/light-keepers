/**
 * SettingsPage.tsx
 * 
 * 系統設定頁面
 */
import React from 'react';

export default function SettingsPage() {
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
                ⚙️ 系統設定
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                系統參數、環境配置、整合設定
            </p>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxWidth: '600px',
            }}>
                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>🌐 語言設定</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>繁體中文 (zh-TW)</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>🌙 主題模式</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>深色模式 (Dark Mode)</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>🔔 通知設定</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Web Push 已啟用</div>
                </div>

                <div style={{
                    padding: '20px',
                    background: 'rgba(47, 54, 65, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(195, 155, 111, 0.2)',
                }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>📱 PWA 設定</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>已安裝為獨立應用</div>
                </div>
            </div>
        </div>
    );
}
