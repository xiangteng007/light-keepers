/**
 * 網路狀態指示器
 * 顯示離線狀態和待同步回報數量
 */
import { useNetworkStatus } from '../hooks/useOfflineReports';
import { OnlineIcon, OfflineIcon } from '../design-system/icons';
import './NetworkStatus.css';

interface NetworkStatusProps {
    pendingCount?: number;
    onSync?: () => void;
    className?: string;
}

export function NetworkStatus({ pendingCount = 0, onSync, className = '' }: NetworkStatusProps) {
    const isOnline = useNetworkStatus();

    if (isOnline && pendingCount === 0) {
        return null; // Don't show when everything is normal
    }

    return (
        <div className={`network-status ${isOnline ? 'online' : 'offline'} ${className}`}>
            <div className="network-status-icon" aria-hidden="true">
                {isOnline ? <OnlineIcon size={16} /> : <OfflineIcon size={16} />}
            </div>
            <div className="network-status-content">
                <span className="network-status-text">
                    {isOnline ? '已連線' : '離線模式'}
                </span>
                {pendingCount > 0 && (
                    <span className="pending-badge">
                        {pendingCount} 筆待同步
                    </span>
                )}
            </div>
            {isOnline && pendingCount > 0 && onSync && (
                <button className="sync-btn" onClick={onSync}>
                    同步
                </button>
            )}
        </div>
    );
}

// 離線橫幅（全螢幕）
export function OfflineBanner() {
    const isOnline = useNetworkStatus();

    if (isOnline) return null;

    return (
        <div className="offline-banner">
            <span className="offline-icon" aria-hidden="true"><OfflineIcon size={20} /></span>
            <span>您目前處於離線模式，部分功能可能受限。資料將在連線後自動同步。</span>
        </div>
    );
}
