import React, { useState } from 'react';
import { LayersIcon, WarningIcon, LocationIcon, CloseIcon, type LkIcon } from '../../design-system/icons';
import type { OverlayFeature } from '../map';
import './PublishWorkflowPanel.css';

interface PublishWorkflowPanelProps {
    drafts: OverlayFeature[];
    onPublish: (overlayIds: string[]) => Promise<void>;
    onPublishAll: () => Promise<void>;
    onDiscard: (overlayId: string) => Promise<void>;
    isProcessing?: boolean;
}

export const PublishWorkflowPanel: React.FC<PublishWorkflowPanelProps> = ({
    drafts,
    onPublish,
    onPublishAll,
    onDiscard,
    isProcessing = false,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(true);

    if (drafts.length === 0) {
        return null;
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === drafts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(drafts.map(d => d.id)));
        }
    };

    const handlePublishSelected = async () => {
        if (selectedIds.size === 0) return;
        await onPublish(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    // R5/T5c：B3c 教範圖例，不再使用 emoji
    const getTypeIcon = (type: string): LkIcon => {
        switch (type) {
            case 'aoi': return LayersIcon;
            case 'hazard': return WarningIcon;
            case 'poi': return LocationIcon;
            default: return LocationIcon;
        }
    };

    return (
        <div className="pwp-container">
            <div className="pwp-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="pwp-header-left">
                    <span className="pwp-badge">{drafts.length}</span>
                    <span className="pwp-title">草稿待發布</span>
                </div>
                <span className="pwp-toggle">{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && (
                <div className="pwp-content">
                    <div className="pwp-actions">
                        <button
                            className="pwp-btn pwp-btn--select-all"
                            onClick={selectAll}
                        >
                            {selectedIds.size === drafts.length ? '取消全選' : '全選'}
                        </button>
                        <button
                            className="pwp-btn pwp-btn--publish"
                            onClick={handlePublishSelected}
                            disabled={selectedIds.size === 0 || isProcessing}
                        >
                            發布選中 ({selectedIds.size})
                        </button>
                        <button
                            className="pwp-btn pwp-btn--publish-all"
                            onClick={onPublishAll}
                            disabled={isProcessing}
                        >
                            全部發布
                        </button>
                    </div>

                    <div className="pwp-list">
                        {drafts.map(draft => (
                            <div
                                key={draft.id}
                                className={`pwp-item ${selectedIds.has(draft.id) ? 'selected' : ''}`}
                            >
                                <label className="pwp-item-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(draft.id)}
                                        onChange={() => toggleSelection(draft.id)}
                                    />
                                </label>
                                <span className="pwp-item-icon" aria-hidden="true">
                                    {(() => { const TypeIcon = getTypeIcon(draft.type); return <TypeIcon size={16} />; })()}
                                </span>
                                <div className="pwp-item-info">
                                    <span className="pwp-item-name">
                                        {draft.properties.name || `${draft.type}-${draft.id.slice(0, 6)}`}
                                    </span>
                                    <span className="pwp-item-type">{draft.type}</span>
                                </div>
                                <button
                                    className="pwp-item-discard"
                                    onClick={() => onDiscard(draft.id)}
                                    disabled={isProcessing}
                                    title="捨棄草稿"
                                >
                                    <CloseIcon size={16} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublishWorkflowPanel;
