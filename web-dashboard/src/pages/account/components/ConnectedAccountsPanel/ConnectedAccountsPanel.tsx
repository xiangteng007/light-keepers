/**
 * ConnectedAccountsPanel Component
 * 
 * Manage connected accounts: LINE, Google.
 */

import React, { useState } from 'react';
import {
    Link2,
    Unlink,
    ExternalLink,
    MessageCircle,
    Mail,
    Clock,
    CheckCircle,
} from 'lucide-react';
import type { ConnectedAccountsPanelProps } from '../../account.types';
import styles from './ConnectedAccountsPanel.module.css';

const ConnectedAccountsPanel: React.FC<ConnectedAccountsPanelProps> = ({
    data,
    onConnectLine,
    onDisconnectLine,
    onConnectGoogle,
    onDisconnectGoogle,
}) => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const handleAction = async (action: () => Promise<void>, actionName: string) => {
        setLoadingAction(actionName);
        try {
            await action();
        } catch (error) {
            console.error(`Failed to ${actionName}:`, error);
        } finally {
            setLoadingAction(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className={styles.panel}>
            <h3 className={styles.sectionTitle}>連結帳戶</h3>
            <p className={styles.sectionDesc}>
                連結外部帳戶以便快速登入或接收通知
            </p>

            <div className={styles.accountList}>
                {/* LINE */}
                <div className={`${styles.accountCard} ${data.lineLinked ? styles.connected : ''}`}>
                    <div className={styles.accountHeader}>
                        <div className={styles.platformLogo} style={{ background: 'rgba(6, 199, 85, 0.1)' }}>
                            <MessageCircle size={24} color="#06C755" />
                        </div>
                        <div className={styles.platformInfo}>
                            <h4>LINE</h4>
                            <p>接收即時通知與緊急警報</p>
                        </div>
                        <div className={styles.statusBadge}>
                            {data.lineLinked ? (
                                <span className={styles.connectedBadge}>
                                    <CheckCircle size={14} />
                                    已連結
                                </span>
                            ) : (
                                <span className={styles.disconnectedBadge}>
                                    未連結
                                </span>
                            )}
                        </div>
                    </div>

                    {data.lineLinked ? (
                        <div className={styles.accountDetails}>
                            {data.lineDisplayName && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>LINE 名稱</span>
                                    <span className={styles.detailValue}>{data.lineDisplayName}</span>
                                </div>
                            )}
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>連結時間</span>
                                <span className={styles.detailValue}>
                                    <Clock size={14} />
                                    {formatDate(data.lineLinkedAt)}
                                </span>
                            </div>
                            <button
                                className={styles.disconnectBtn}
                                onClick={() => handleAction(onDisconnectLine, 'disconnectLine')}
                                disabled={loadingAction === 'disconnectLine'}
                            >
                                <Unlink size={16} />
                                {loadingAction === 'disconnectLine' ? '解除中...' : '解除連結'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.accountAction}>
                            <button
                                className={styles.connectBtn}
                                onClick={() => handleAction(onConnectLine, 'connectLine')}
                                disabled={loadingAction === 'connectLine'}
                            >
                                <Link2 size={16} />
                                {loadingAction === 'connectLine' ? '連結中...' : '連結 LINE 帳號'}
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Google */}
                <div className={`${styles.accountCard} ${data.googleLinked ? styles.connected : ''}`}>
                    <div className={styles.accountHeader}>
                        <div className={styles.platformLogo} style={{ background: 'rgba(66, 133, 244, 0.1)' }}>
                            <Mail size={24} color="#4285F4" />
                        </div>
                        <div className={styles.platformInfo}>
                            <h4>Google</h4>
                            <p>使用 Google 帳號快速登入</p>
                        </div>
                        <div className={styles.statusBadge}>
                            {data.googleLinked ? (
                                <span className={styles.connectedBadge}>
                                    <CheckCircle size={14} />
                                    已連結
                                </span>
                            ) : (
                                <span className={styles.disconnectedBadge}>
                                    未連結
                                </span>
                            )}
                        </div>
                    </div>

                    {data.googleLinked ? (
                        <div className={styles.accountDetails}>
                            {data.googleEmail && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Google 帳號</span>
                                    <span className={styles.detailValue}>{data.googleEmail}</span>
                                </div>
                            )}
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>連結時間</span>
                                <span className={styles.detailValue}>
                                    <Clock size={14} />
                                    {formatDate(data.googleLinkedAt)}
                                </span>
                            </div>
                            <button
                                className={styles.disconnectBtn}
                                onClick={() => handleAction(onDisconnectGoogle, 'disconnectGoogle')}
                                disabled={loadingAction === 'disconnectGoogle'}
                            >
                                <Unlink size={16} />
                                {loadingAction === 'disconnectGoogle' ? '解除中...' : '解除連結'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.accountAction}>
                            <button
                                className={styles.connectBtn}
                                onClick={() => handleAction(onConnectGoogle, 'connectGoogle')}
                                disabled={loadingAction === 'connectGoogle'}
                            >
                                <Link2 size={16} />
                                {loadingAction === 'connectGoogle' ? '連結中...' : '連結 Google 帳號'}
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectedAccountsPanel;
