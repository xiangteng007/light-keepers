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
/* Database(資料庫)/HardDrive(硬碟)/Trash2(刪除) 無 B3c 對應，誠實保留（見 notes）；
   EmptyState 的 icon prop 型別鎖 LucideIcon */
import { Database, Trash2, HardDrive } from 'lucide-react';
import { Button, Badge, Modal, InputField, StatIndicator } from '../design-system';
import {
    TeamsIcon,
    SirenIcon,
    CalendarIcon,
    InventoryIcon,
    UserIcon,
    SettingsIcon,
    SyncIcon,
    PlusIcon,
    ClockIcon,
    FilesIcon,
    DownloadIcon,
    UploadIcon,
    CheckIcon,
    type LkIcon,
} from '../design-system/icons';
import EmptyState from '../components/shared/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton/Skeleton';
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
        if (!confirm(`確定要還原備份「${backup.description || backup.id}」嗎？\n\n注意：此操作會覆蓋現有資料！`)) return;

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
            <header className="page-header">
                <div className="page-header__left">
                    <h1>資料備份</h1>
                    <p>管理系統資料的備份與還原</p>
                </div>
                <div className="page-header__actions">
                    <Button
                        variant="ghost"
                        size="md"
                        icon={<SyncIcon size={18} className={loading ? 'spin' : ''} aria-hidden="true" />}
                        onClick={loadBackups}
                        disabled={loading}
                        aria-label="重新整理備份列表"
                    />
                    <Button
                        variant="primary"
                        icon={<PlusIcon size={18} aria-hidden="true" />}
                        onClick={() => setShowCreateModal(true)}
                        disabled={creating}
                    >
                        建立備份
                    </Button>
                </div>
            </header>

            {/* 統計摘要 */}
            <div className="backup-stats">
                <StatIndicator icon={<Database size={20} aria-hidden="true" />} value={backups.length} label="備份數量" />
                <StatIndicator
                    icon={<HardDrive size={20} aria-hidden="true" />}
                    value={formatSize(backups.reduce((sum, b) => sum + (b.size || 0), 0))}
                    label="總使用空間"
                />
                <StatIndicator
                    icon={<ClockIcon size={20} aria-hidden="true" />}
                    value={backups.length > 0 ? formatDate(backups[0].createdAt).split(' ')[0] : '-'}
                    label="最近備份"
                />
            </div>

            {/* 備份列表 */}
            <section className="panel backup-list" aria-labelledby="backup-list-heading">
                <h2 id="backup-list-heading" className="panel-title">備份記錄</h2>
                {loading ? (
                    <SkeletonList count={4} />
                ) : backups.length === 0 ? (
                    <EmptyState
                        icon={Database}
                        title="尚無備份記錄"
                        description="建立第一個備份以保護系統資料。"
                        action={{ label: '建立第一個備份', onClick: () => setShowCreateModal(true) }}
                    />
                ) : (
                    <div className="backup-table" role="table">
                        <div className="backup-table__header" role="row">
                            <span role="columnheader">備份</span>
                            <span role="columnheader">模組</span>
                            <span role="columnheader">大小</span>
                            <span role="columnheader">時間</span>
                            <span role="columnheader">操作</span>
                        </div>
                        {backups.map(backup => (
                            <div key={backup.id} className="backup-row" role="row">
                                <div className="backup-row__info">
                                    <FilesIcon size={20} aria-hidden="true" />
                                    <div>
                                        <span className="backup-name">
                                            {backup.description || `備份 ${backup.id.slice(0, 8)}`}
                                        </span>
                                        <span className="backup-id">{backup.id.slice(0, 12)}...</span>
                                    </div>
                                </div>

                                <div className="backup-row__modules">
                                    {backup.modules?.map(mod => (
                                        <Badge key={mod} variant="info" size="sm">{mod}</Badge>
                                    ))}
                                </div>

                                <span className="backup-row__size tabular-num">{formatSize(backup.size)}</span>

                                <time className="backup-row__time tabular-num" dateTime={backup.createdAt}>
                                    {formatDate(backup.createdAt)}
                                </time>

                                <div className="backup-row__actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => handleDownload(backup)}
                                        aria-label={`下載備份 ${backup.description || backup.id}`}
                                        title="下載"
                                    >
                                        <DownloadIcon size={16} aria-hidden="true" />
                                    </button>
                                    <button
                                        className="action-btn action-btn--restore"
                                        onClick={() => handleRestore(backup)}
                                        disabled={restoring === backup.id}
                                        aria-label={`還原備份 ${backup.description || backup.id}`}
                                        title="還原"
                                    >
                                        {restoring === backup.id ? (
                                            <SyncIcon size={16} className="spin" aria-hidden="true" />
                                        ) : (
                                            <UploadIcon size={16} aria-hidden="true" />
                                        )}
                                    </button>
                                    <button
                                        className="action-btn action-btn--delete"
                                        onClick={() => handleDelete(backup)}
                                        aria-label={`刪除備份 ${backup.description || backup.id}`}
                                        title="刪除"
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 建立備份 Modal */}
            <CreateBackupModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onConfirm={handleCreateBackup}
                creating={creating}
            />
        </div>
    );
}

// ===== 建立備份 Modal =====
function CreateBackupModal({
    isOpen,
    onClose,
    onConfirm,
    creating,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (modules: string[], description: string) => void;
    creating: boolean;
}) {
    // R5/T5c：B3c 教範圖例，不再使用 emoji
    const MODULE_OPTIONS: { value: string; label: string; Icon: LkIcon }[] = [
        { value: 'volunteers', label: '志工資料', Icon: TeamsIcon },
        { value: 'events', label: '事件資料', Icon: SirenIcon },
        { value: 'activities', label: '活動資料', Icon: CalendarIcon },
        { value: 'resources', label: '物資資料', Icon: InventoryIcon },
        { value: 'users', label: '使用者資料', Icon: UserIcon },
        { value: 'settings', label: '系統設定', Icon: SettingsIcon },
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="建立備份"
            className="create-backup-modal"
            footer={(
                <div className="modal-actions">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        取消
                    </Button>
                    <Button
                        type="submit"
                        form="create-backup-form"
                        variant="primary"
                        icon={creating ? <SyncIcon size={16} className="spin" aria-hidden="true" /> : <Database size={16} aria-hidden="true" />}
                        disabled={creating || selectedModules.length === 0}
                        loading={creating}
                    >
                        {creating ? '備份中...' : '建立備份'}
                    </Button>
                </div>
            )}
        >
            <form id="create-backup-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <span className="form-group__label" id="backup-module-label">選擇要備份的模組</span>
                    <div className="module-grid" role="group" aria-labelledby="backup-module-label">
                        {MODULE_OPTIONS.map(mod => {
                            const selected = selectedModules.includes(mod.value);
                            return (
                                <button
                                    key={mod.value}
                                    type="button"
                                    className={`module-option ${selected ? 'module-option--selected' : ''}`}
                                    onClick={() => toggleModule(mod.value)}
                                    aria-pressed={selected}
                                >
                                    <span className="module-icon" aria-hidden="true"><mod.Icon size={20} /></span>
                                    <span className="module-label">{mod.label}</span>
                                    {selected && (
                                        <CheckIcon size={16} className="check-icon" aria-hidden="true" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group">
                    <InputField
                        label="備份說明（選填）"
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="例：系統升級前備份"
                        fullWidth
                    />
                </div>
            </form>
        </Modal>
    );
}
