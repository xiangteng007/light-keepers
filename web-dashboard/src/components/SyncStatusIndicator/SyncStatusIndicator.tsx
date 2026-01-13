/**
 * Sync Status Indicator Component
 * 
 * Visual indicator for offline sync status
 * v1.0
 */

import React from 'react';
import {
    Cloud,
    CloudOff,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
} from 'lucide-react';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import styles from './SyncStatusIndicator.module.css';

export const SyncStatusIndicator: React.FC = () => {
    const { isOnline, isSyncing, pendingChanges, lastSyncAt, sync } = useSyncStatus();

    const formatLastSync = () => {
        if (!lastSyncAt) return '從未同步';
        const diff = Date.now() - lastSyncAt;
        if (diff < 60000) return '剛才';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
        return new Date(lastSyncAt).toLocaleDateString('zh-TW');
    };

    const getStatusIcon = () => {
        if (!isOnline) {
            return <CloudOff size={16} className={styles.offlineIcon} />;
        }
        if (isSyncing) {
            return <RefreshCw size={16} className={styles.syncingIcon} />;
        }
        if (pendingChanges > 0) {
            return <AlertTriangle size={16} className={styles.pendingIcon} />;
        }
        return <Cloud size={16} className={styles.onlineIcon} />;
    };

    const getStatusText = () => {
        if (!isOnline) return '離線模式';
        if (isSyncing) return '同步中...';
        if (pendingChanges > 0) return `${pendingChanges} 項待同步`;
        return '已同步';
    };

    const handleClick = async () => {
        if (isOnline && !isSyncing && pendingChanges > 0) {
            await sync();
        }
    };

    return (
        <div
            className={`${styles.indicator} ${!isOnline ? styles.offline : ''} ${pendingChanges > 0 ? styles.pending : ''}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            title={`最後同步: ${formatLastSync()}`}
        >
            {getStatusIcon()}
            <span className={styles.text}>{getStatusText()}</span>
            {pendingChanges > 0 && isOnline && !isSyncing && (
                <span className={styles.badge}>{pendingChanges}</span>
            )}
        </div>
    );
};

export default SyncStatusIndicator;
