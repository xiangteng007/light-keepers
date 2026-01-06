/**
 * Spectrum Viewer Component - 頻譜顯示
 * Spectrum Analysis 功能
 */

import React, { useRef, useEffect, useState } from 'react';
import './SpectrumViewer.css';

// Types
interface Signal {
    frequency: number;
    power: number;
    bandwidth?: number;
    type?: string;
}

interface Anomaly {
    id: string;
    frequency: number;
    power: number;
    type: 'jamming' | 'interference' | 'unknown';
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
}

interface SpectrumViewerProps {
    signals: Signal[];
    anomalies?: Anomaly[];
    frequencyRange: { min: number; max: number };
    powerRange?: { min: number; max: number };
    refreshRate?: number;
    onAnomalyClick?: (anomaly: Anomaly) => void;
}

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({
    signals,
    anomalies = [],
    frequencyRange,
    powerRange = { min: -120, max: 0 },
    refreshRate = 100,
    onAnomalyClick,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

    // Draw spectrum
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const freqSpan = frequencyRange.max - frequencyRange.min;
        const powerSpan = powerRange.max - powerRange.min;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal grid lines (power)
        for (let i = 0; i <= 10; i++) {
            const y = (i / 10) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical grid lines (frequency)
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Draw spectrum
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;

        signals.forEach((signal, index) => {
            const x = ((signal.frequency - frequencyRange.min) / freqSpan) * width;
            const y = height - ((signal.power - powerRange.min) / powerSpan) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Fill under curve
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        signals.forEach((signal, index) => {
            const x = ((signal.frequency - frequencyRange.min) / freqSpan) * width;
            const y = height - ((signal.power - powerRange.min) / powerSpan) * height;

            if (index === 0) {
                ctx.moveTo(x, height);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Draw anomalies
        anomalies.forEach(anomaly => {
            const x = ((anomaly.frequency - frequencyRange.min) / freqSpan) * width;
            const y = height - ((anomaly.power - powerRange.min) / powerSpan) * height;

            const color = anomaly.severity === 'high' ? '#ef4444' :
                anomaly.severity === 'medium' ? '#f59e0b' : '#3b82f6';

            // Pulsing circle
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Draw labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px monospace';

        // Frequency labels
        for (let i = 0; i <= 4; i++) {
            const freq = frequencyRange.min + (i / 4) * freqSpan;
            const x = (i / 4) * width;
            ctx.fillText(`${(freq / 1e6).toFixed(1)} MHz`, x + 5, height - 5);
        }

        // Power labels
        for (let i = 0; i <= 4; i++) {
            const power = powerRange.max - (i / 4) * powerSpan;
            const y = (i / 4) * height;
            ctx.fillText(`${power} dBm`, 5, y + 12);
        }
    }, [signals, anomalies, frequencyRange, powerRange]);

    const getSeverityLabel = (severity: Anomaly['severity']) => {
        const labels = {
            low: '低',
            medium: '中',
            high: '高',
        };
        return labels[severity];
    };

    const getTypeLabel = (type: Anomaly['type']) => {
        const labels = {
            jamming: '🚨 干擾器',
            interference: '⚠️ 雜訊',
            unknown: '❓ 未知',
        };
        return labels[type];
    };

    return (
        <div className="spectrum-viewer">
            <div className="viewer-header">
                <h3>📡 頻譜分析</h3>
                <div className="freq-range">
                    {(frequencyRange.min / 1e6).toFixed(0)} - {(frequencyRange.max / 1e6).toFixed(0)} MHz
                </div>
            </div>

            <div className="canvas-container">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={300}
                    className="spectrum-canvas"
                />
            </div>

            {/* Anomaly List */}
            {anomalies.length > 0 && (
                <div className="anomaly-list">
                    <h4>偵測到的異常 ({anomalies.length})</h4>
                    {anomalies.map(anomaly => (
                        <div
                            key={anomaly.id}
                            className={`anomaly-item severity-${anomaly.severity}`}
                            onClick={() => {
                                setSelectedAnomaly(anomaly);
                                onAnomalyClick?.(anomaly);
                            }}
                        >
                            <span className="type">{getTypeLabel(anomaly.type)}</span>
                            <span className="freq">{(anomaly.frequency / 1e6).toFixed(2)} MHz</span>
                            <span className="power">{anomaly.power} dBm</span>
                            <span className={`severity ${anomaly.severity}`}>
                                {getSeverityLabel(anomaly.severity)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="viewer-legend">
                <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#22c55e' }} />
                    正常信號
                </div>
                <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#ef4444' }} />
                    高危異常
                </div>
                <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#f59e0b' }} />
                    中度異常
                </div>
            </div>
        </div>
    );
};

export default SpectrumViewer;
