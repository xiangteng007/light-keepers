import React, { useState, useCallback } from 'react';
import './SOSButton.css';

interface SOSButtonProps {
    onTrigger: (lat: number, lng: number, accuracyM?: number, message?: string) => Promise<void>;
    isEnabled?: boolean;
}

/**
 * SOS Button Component for Field Workers
 * Features:
 * - Long press to activate (prevent accidental triggers)
 * - Visual feedback during press
 * - Optional message input
 * - Confirmation after trigger
 */
export const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger, isEnabled = true }) => {
    const [isPressing, setIsPressing] = useState(false);
    const [pressProgress, setPressProgress] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const PRESS_DURATION = 2000; // 2 seconds to activate

    const handlePressStart = useCallback(() => {
        if (!isEnabled || isTriggering) return;

        setIsPressing(true);
        setError(null);

        let startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / PRESS_DURATION, 1);
            setPressProgress(progress);

            if (progress >= 1) {
                clearInterval(interval);
                triggerSos();
            }
        }, 50);

        // Store interval ID for cleanup
        (window as any).__sosInterval = interval;
    }, [isEnabled, isTriggering]);

    const handlePressEnd = useCallback(() => {
        if ((window as any).__sosInterval) {
            clearInterval((window as any).__sosInterval);
        }
        setIsPressing(false);
        setPressProgress(0);
    }, []);

    const triggerSos = async () => {
        setIsTriggering(true);
        handlePressEnd();

        try {
            // Get current location
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                    return;
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });

            const { latitude, longitude, accuracy } = position.coords;
            await onTrigger(latitude, longitude, accuracy);

            setShowConfirmation(true);

            // Auto-hide confirmation after 5 seconds
            setTimeout(() => {
                setShowConfirmation(false);
            }, 5000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'SOS 發送失敗');
        } finally {
            setIsTriggering(false);
        }
    };

    if (showConfirmation) {
        return (
            <div className="sos-confirmation">
                <div className="sos-confirmation-icon">✓</div>
                <div className="sos-confirmation-text">
                    <strong>SOS 已發送</strong>
                    <p>指揮中心已收到您的求救信號</p>
                </div>
                <button
                    className="sos-confirmation-close"
                    onClick={() => setShowConfirmation(false)}
                >
                    確認
                </button>
            </div>
        );
    }

    return (
        <div className="sos-button-container">
            <button
                className={`sos-button ${isPressing ? 'pressing' : ''} ${!isEnabled ? 'disabled' : ''}`}
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                disabled={!isEnabled || isTriggering}
            >
                <div
                    className="sos-progress-ring"
                    style={{
                        background: `conic-gradient(#dc2626 ${pressProgress * 360}deg, transparent 0deg)`
                    }}
                />
                <div className="sos-button-inner">
                    <span className="sos-icon">SOS</span>
                    <span className="sos-instruction">
                        {isTriggering ? '發送中...' : '長按求救'}
                    </span>
                </div>
            </button>

            {error && (
                <div className="sos-error">
                    ⚠️ {error}
                </div>
            )}

            <p className="sos-hint">按住 2 秒發送求救信號</p>
        </div>
    );
};

export default SOSButton;
