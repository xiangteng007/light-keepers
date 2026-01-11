/**
 * Widget.tsx
 * 
 * iOS Widget-style card component with glass morphism design
 */
import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Eye, EyeOff, Lock, Unlock, Settings, Pencil, Trash2 } from 'lucide-react';
import { WidgetConfig } from './widget.types';
import './Widget.css';

interface WidgetProps {
    config: WidgetConfig;
    isEditMode: boolean;
    isSelected: boolean;
    canEdit: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
    onTitleChange?: (newTitle: string) => void;
    onRemove?: () => void;  // NEW
    children?: React.ReactNode;
}

export function Widget({
    config,
    isEditMode,
    isSelected,
    canEdit,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onTitleChange,
    onRemove,
    children,
}: WidgetProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(config.title);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Sync title value when config changes
    useEffect(() => {
        setTitleValue(config.title);
    }, [config.title]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleTitleDoubleClick = (e: React.MouseEvent) => {
        if (isEditMode && canEdit) {
            e.stopPropagation();
            setIsEditingTitle(true);
        }
    };

    const handleTitleSave = () => {
        if (titleValue.trim() && onTitleChange) {
            onTitleChange(titleValue.trim());
        } else {
            setTitleValue(config.title);  // Revert if empty
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSave();
        } else if (e.key === 'Escape') {
            setTitleValue(config.title);
            setIsEditingTitle(false);
        }
    };

    const styleClass = `widget widget--${config.style || 'card'}`;
    const editableClass = isEditMode ? 'widget--editable' : '';
    const selectedClass = isSelected ? 'widget--selected' : '';
    const lockedClass = config.locked ? 'widget--locked' : '';

    return (
        <div
            className={`${styleClass} ${editableClass} ${selectedClass} ${lockedClass}`}
            onClick={isEditMode ? onSelect : undefined}
        >
            {/* Widget Header */}
            <div className="widget__header">
                {/* Drag Handle - Only visible in edit mode */}
                {isEditMode && canEdit && !config.locked && (
                    <div className="widget__drag-handle">
                        <GripVertical size={16} />
                    </div>
                )}

                {/* Title - Editable on double-click in edit mode */}
                {isEditingTitle ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        className="widget__title-input"
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={handleTitleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <h3
                        className="widget__title"
                        onDoubleClick={handleTitleDoubleClick}
                        title={isEditMode ? '雙擊編輯標題' : undefined}
                    >
                        {config.title}
                        {isEditMode && canEdit && (
                            <button
                                className="widget__title-edit-btn"
                                onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                                title="編輯標題"
                            >
                                <Pencil size={12} />
                            </button>
                        )}
                    </h3>
                )}

                {/* Region Tag */}
                <span className="widget__region">[{config.region}]</span>

                {/* Edit Controls - Only visible in edit mode for Level 5 */}
                {isEditMode && canEdit && (
                    <div className="widget__controls">
                        <button
                            className="widget__control-btn"
                            onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                            title={config.locked ? '解鎖' : '鎖定'}
                        >
                            {config.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button
                            className="widget__control-btn"
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                            title="隱藏"
                        >
                            <EyeOff size={14} />
                        </button>
                        {onRemove && (
                            <button
                                className="widget__control-btn widget__control-btn--danger"
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                title="刪除"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Widget Content */}
            <div className="widget__content">
                {children || (
                    <div className="widget__placeholder">
                        {config.title}
                    </div>
                )}
            </div>

            {/* Resize Handle Indicator - Only in edit mode */}
            {isEditMode && canEdit && !config.locked && (
                <div className="widget__resize-indicator" />
            )}
        </div>
    );
}

/**
 * WidgetEditControls - Floating toolbar for Level 5 users
 */
interface WidgetEditControlsProps {
    isEditMode: boolean;
    canEdit: boolean;
    hiddenWidgets: WidgetConfig[];
    onToggleEditMode: () => void;
    onResetLayout: () => void;
    onShowWidget: (widgetId: string) => void;
    onAddWidget?: () => void;  // NEW
}

export function WidgetEditControls({
    isEditMode,
    canEdit,
    hiddenWidgets,
    onToggleEditMode,
    onResetLayout,
    onShowWidget,
    onAddWidget,
}: WidgetEditControlsProps) {
    if (!canEdit) return null;

    return (
        <div className="widget-edit-controls">
            {/* Add Widget Button - Only in edit mode */}
            {isEditMode && onAddWidget && (
                <button
                    className="widget-edit-controls__btn widget-edit-controls__btn--add"
                    onClick={onAddWidget}
                >
                    + 新增 Widget
                </button>
            )}

            <button
                className={`widget-edit-controls__btn ${isEditMode ? 'active' : ''}`}
                onClick={onToggleEditMode}
            >
                <Settings size={18} />
                {isEditMode ? '完成編輯' : '編輯佈局'}
            </button>

            {isEditMode && (
                <>
                    <button
                        className="widget-edit-controls__btn widget-edit-controls__btn--danger"
                        onClick={onResetLayout}
                    >
                        重置佈局
                    </button>

                    {hiddenWidgets.length > 0 && (
                        <div className="widget-edit-controls__hidden">
                            <span>隱藏的 Widget ({hiddenWidgets.length}):</span>
                            {hiddenWidgets.map(w => (
                                <button
                                    key={w.id}
                                    className="widget-edit-controls__show-btn"
                                    onClick={() => onShowWidget(w.id)}
                                >
                                    <Eye size={14} /> {w.title}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
