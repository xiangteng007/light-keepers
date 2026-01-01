/**
 * 備份管理頁面
 * Backup Management Page
 */
import React, { useState, useEffect } from 'react';
import {
    getBackups,
    createBackup,
    downloadBackup,
    restoreBackup,
    deleteBackup,
    type BackupInfo,
} from '../api/services';
import {
    Database,
    Download,
    Upload,
    Trash2,
    Plus,
    Clock,
    HardDrive,
    CheckCircle,
    RefreshCw,
    X,
    FileJson,
} from 'lucide-react';
import './BackupPage.css';

export default function BackupPage() {
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [restoring, setRestoring] = useState<string | null>(null);

    // 載入備份列表
    const loadBackups = async () => {
        try {
            setLoading(true);
            const res = await getBackups();
            setBackups(res.data.data || []);
        } catch (error) {
            console.error('Failed to load backups:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    // 建立備份
    const handleCreateBackup = async (modules: string[], description: string) => {
        try {
            setCreating(true);
            await createBackup({ modules, description });
            alert('備份已成功建立');
            loadBackups();
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create backup:', error);
            alert('備份建立失敗，請稍後再試');
        } finally {
            setCreating(false);
        }
    };

    // 下載備份
    const handleDownload = async (backup: BackupInfo) => {
        try {
            const res = await downloadBackup(backup.id);
            // 創建下載連結
            const url = window.URL.createObjectURL(new Blob([JSON.stringify(res.data, null, 2)]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${backup.id}_${new Date(backup.createdAt).toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download backup:', error);
            alert('下載失敗，請稍後再試');
        }
    };

    // 還原備份
    const handleRestore = async (backup: BackupInfo) => {
        if (!confirm(`確定要還原備份「${backup.description || backup.id}」嗎？\n\n⚠️ 此操作會覆蓋現有資料！`)) return;

        try {
            setRestoring(backup.id);
            await restoreBackup(backup.id);
            alert('備份已成功還原');
            loadBackups();
        } catch (error) {
            console.error('Failed to restore backup:', error);
            alert('還原失敗，請稍後再試');
        } finally {
            setRestoring(null);
        }
    };

    // 刪除備份
    const handleDelete = async (backup: BackupInfo) => {
        if (!confirm(`確定要刪除備份「${backup.description || backup.id}」嗎？`)) return;

        try {
            await deleteBackup(backup.id);
            loadBackups();
        } catch (error) {
            console.error('Failed to delete backup:', error);
            alert('刪除失敗，請稍後再試');
        }
    };

    // 格式化檔案大小
    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // 格式化日期
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-TW', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="backup-page">
            {/* 頁面標題 */}
            <header className="backup-header">
                <div className="backup-header__title">
                    <h1>💾 資料備份</h1>
                    <p>管理系統資料的備份與還原</p>
                </div>
                <div className="backup-header__actions">
                    <button
                        className="btn-refresh"
                        onClick={loadBackups}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                    <button
                        className="btn-create"
                        onClick={() => setShowCreateModal(true)}
                        disabled={creating}
                    >
                        <Plus size={18} />
                        建立備份
                    </button>
                </div>
            </header>

            {/* 統計卡片 */}
            <div className="backup-stats">
                <div className="stat-card">
                    <Database size={24} />
                    <div>
                        <span className="stat-value">{backups.length}</span>
                        <span className="stat-label">備份數量</span>
                    </div>
                </div>
                <div className="stat-card">
                    <HardDrive size={24} />
                    <div>
                        <span className="stat-value">
                            {formatSize(backups.reduce((sum, b) => sum + (b.size || 0), 0))}
                        </span>
                        <span className="stat-label">總使用空間</span>
                    </div>
                </div>
                <div className="stat-card">
                    <Clock size={24} />
                    <div>
                        <span className="stat-value">
                            {backups.length > 0
                                ? formatDate(backups[0].createdAt).split(' ')[0]
                                : '-'
                            }
                        </span>
                        <span className="stat-label">最近備份</span>
                    </div>
                </div>
            </div>

            {/* 備份列表 */}
            <div className="backup-list">
                <h2>備份記錄</h2>
                {loading ? (
                    <div className="loading">
                        <RefreshCw size={24} className="spin" />
                        載入中...
                    </div>
                ) : backups.length === 0 ? (
                    <div className="empty">
                        <Database size={48} />
                        <p>尚無備份記錄</p>
                        <button onClick={() => setShowCreateModal(true)}>建立第一個備份</button>
                    </div>
                ) : (
                    <div className="backup-table">
                        <div className="backup-table__header">
                            <span>備份</span>
                            <span>模組</span>
                            <span>大小</span>
                            <span>時間</span>
                            <span>操作</span>
                        </div>
                        {backups.map(backup => (
                            <div key={backup.id} className="backup-row">
                                <div className="backup-row__info">
                                    <FileJson size={20} />
                                    <div>
                                        <span className="backup-name">
                                            {backup.description || `備份 ${backup.id.slice(0, 8)}`}
                                        </span>
                                        <span className="backup-id">{backup.id.slice(0, 12)}...</span>
                                    </div>
                                </div>

                                <div className="backup-row__modules">
                                    {backup.modules?.map(mod => (
                                        <span key={mod} className="module-badge">{mod}</span>
                                    ))}
                                </div>

                                <span className="backup-row__size">{formatSize(backup.size)}</span>

                                <span className="backup-row__time">{formatDate(backup.createdAt)}</span>

                                <div className="backup-row__actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => handleDownload(backup)}
                                        title="下載"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        className="action-btn restore"
                                        onClick={() => handleRestore(backup)}
                                        disabled={restoring === backup.id}
                                        title="還原"
                                    >
                                        {restoring === backup.id ? (
                                            <RefreshCw size={16} className="spin" />
                                        ) : (
                                            <Upload size={16} />
                                        )}
                                    </button>
                                    <button
                                        className="action-btn delete"
                                        onClick={() => handleDelete(backup)}
                                        title="刪除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 建立備份 Modal */}
            {showCreateModal && (
                <CreateBackupModal
                    onClose={() => setShowCreateModal(false)}
                    onConfirm={handleCreateBackup}
                    creating={creating}
                />
            )}
        </div>
    );
}

// ===== 建立備份 Modal =====
function CreateBackupModal({
    onClose,
    onConfirm,
    creating,
}: {
    onClose: () => void;
    onConfirm: (modules: string[], description: string) => void;
    creating: boolean;
}) {
    const MODULE_OPTIONS = [
        { value: 'volunteers', label: '志工資料', icon: '👥' },
        { value: 'events', label: '事件資料', icon: '🚨' },
        { value: 'activities', label: '活動資料', icon: '📅' },
        { value: 'resources', label: '物資資料', icon: '📦' },
        { value: 'users', label: '使用者資料', icon: '👤' },
        { value: 'settings', label: '系統設定', icon: '⚙️' },
    ];

    const [selectedModules, setSelectedModules] = useState<string[]>(
        MODULE_OPTIONS.map(m => m.value)
    );
    const [description, setDescription] = useState('');

    const toggleModule = (value: string) => {
        setSelectedModules(prev =>
            prev.includes(value)
                ? prev.filter(m => m !== value)
                : [...prev, value]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedModules.length === 0) {
            alert('請至少選擇一個模組');
            return;
        }
        onConfirm(selectedModules, description);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-backup-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>建立備份</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>選擇要備份的模組</label>
                        <div className="module-grid">
                            {MODULE_OPTIONS.map(mod => (
                                <button
                                    key={mod.value}
                                    type="button"
                                    className={`module-option ${selectedModules.includes(mod.value) ? 'selected' : ''}`}
                                    onClick={() => toggleModule(mod.value)}
                                >
                                    <span className="module-icon">{mod.icon}</span>
                                    <span className="module-label">{mod.label}</span>
                                    {selectedModules.includes(mod.value) && (
                                        <CheckCircle size={16} className="check-icon" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>備份說明（選填）</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="例：系統升級前備份"
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={creating || selectedModules.length === 0}
                        >
                            {creating ? (
                                <>
                                    <RefreshCw size={16} className="spin" />
                                    備份中...
                                </>
                            ) : (
                                <>
                                    <Database size={16} />
                                    建立備份
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
