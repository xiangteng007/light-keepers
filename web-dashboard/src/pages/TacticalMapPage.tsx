/**
 * TacticalMapPage.tsx
 * 
 * 戰術地圖頁面 - 互動式災情地圖
 */
import React from 'react';

export default function TacticalMapPage() {
    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--text-primary)',
        }}>
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(195, 155, 111, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
            }}>
                <h1 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'var(--accent-gold)',
                    margin: 0,
                }}>
                    🗺️ 戰術地圖
                </h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['災情', '資源', '人員', '路線'].map((layer, i) => (
                        <button key={i} style={{
                            padding: '6px 12px',
                            background: i === 0 ? 'rgba(195, 155, 111, 0.2)' : 'rgba(47, 54, 65, 0.5)',
                            border: i === 0 ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: i === 0 ? 'var(--accent-gold)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}>
                            {layer}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{
                flex: 1,
                background: 'linear-gradient(135deg, rgba(47, 54, 65, 0.5) 0%, rgba(11, 17, 27, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            }}>
                {/* 地圖區域placeholder */}
                <div style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗺️</div>
                    <div style={{ fontSize: '16px' }}>互動式地圖載入中...</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>整合 Mapbox / OpenStreetMap</div>
                </div>

                {/* 右下角控制按鈕 */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}>
                    {['+', '−', '⌖'].map((btn, i) => (
                        <button key={i} style={{
                            width: '36px',
                            height: '36px',
                            background: 'rgba(47, 54, 65, 0.9)',
                            border: '1px solid rgba(195, 155, 111, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '18px',
                            cursor: 'pointer',
                        }}>
                            {btn}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
