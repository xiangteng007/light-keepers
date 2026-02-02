/**
 * Offline Mode Indicator Component
 * 
 * Displays network status and sync queue information.
 * Provides visual feedback for offline/online state.
 */

import React, { useState, useEffect } from 'react';
import './OfflineIndicator.css';

interface SyncQueueItem {
    id: string;
    type: string;
    timestamp: number;
}

interface OfflineIndicatorProps {
    syncQueue?: SyncQueueItem[];
    onRetrySync?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
    syncQueue = [],
    onRetrySync
}) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showDetails, setShowDetails] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setLastSyncTime(new Date());
        };
        
        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Don't show if online and no pending items
    if (isOnline && syncQueue.length === 0) {
        return null;
    }

    return (
        <div className={`offline-indicator ${isOnline ? 'offline-indicator--syncing' : 'offline-indicator--offline'}`}>
            <div 
                className="offline-indicator__main"
                onClick={() => setShowDetails(!showDetails)}
                role="button"
                tabIndex={0}
                aria-expanded={showDetails}
            >
                <div className="offline-indicator__icon">
                    {isOnline ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zM17.04 15.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7L12 21.5l3.07-4.04 4.28 4.28 1.27-1.28-3.58-5.24z"/>
                        </svg>
                    )}
                </div>
                
                <div className="offline-indicator__text">
                    {isOnline ? (
                        <>
                            <span className="offline-indicator__status">同步中</span>
                            <span className="offline-indicator__count">{syncQueue.length} 項待同步</span>
                        </>
                    ) : (
                        <>
                            <span className="offline-indicator__status">離線模式</span>
                            <span className="offline-indicator__count">資料將在連線後同步</span>
                        </>
                    )}
                </div>

                {syncQueue.length > 0 && (
                    <div className="offline-indicator__badge">{syncQueue.length}</div>
                )}
            </div>

            {showDetails && (
                <div className="offline-indicator__details">
                    <div className="offline-indicator__details-header">
                        <span>待同步項目</span>
                        {isOnline && onRetrySync && (
                            <button 
                                className="offline-indicator__retry-btn"
                                onClick={onRetrySync}
                            >
                                重試同步
                            </button>
                        )}
                    </div>
                    
                    {syncQueue.length === 0 ? (
                        <p className="offline-indicator__empty">沒有待同步的項目</p>
                    ) : (
                        <ul className="offline-indicator__queue">
                            {syncQueue.slice(0, 5).map(item => (
                                <li key={item.id} className="offline-indicator__queue-item">
                                    <span className="offline-indicator__queue-type">{item.type}</span>
                                    <span className="offline-indicator__queue-time">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                </li>
                            ))}
                            {syncQueue.length > 5 && (
                                <li className="offline-indicator__queue-more">
                                    還有 {syncQueue.length - 5} 項...
                                </li>
                            )}
                        </ul>
                    )}

                    {lastSyncTime && (
                        <p className="offline-indicator__last-sync">
                            上次同步: {lastSyncTime.toLocaleString()}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfflineIndicator;
