/**
 * SidebarSettings.tsx
 * 
 * Modal for editing sidebar navigation items
 * Features: rename items, drag-drop reorder, toggle visibility, RBAC level adjustment
 * v2.1 - Added per-item RBAC level customization
 */
import React, { useState, useRef } from 'react';
import { X, GripVertical, Eye, EyeOff, RotateCcw, Check, Shield, ChevronDown } from 'lucide-react';
import { NavItemConfig, NavGroup, NAV_GROUPS, ICON_MAP } from './useSidebarConfig';
import { PermissionLevel } from './widget.types';
import './SidebarSettings.css';

interface SidebarSettingsProps {
    isOpen: boolean;
    navItems: NavItemConfig[];
    onClose: () => void;
    onUpdateItem: (id: string, updates: Partial<NavItemConfig>) => void;
    onReorder: (oldIndex: number, newIndex: number) => void;
    onReset: () => void;
}

// Permission level labels
const PERMISSION_LABELS: Record<PermissionLevel, string> = {
    [PermissionLevel.Anonymous]: 'L0 訪客',
    [PermissionLevel.Volunteer]: 'L1 志工',
    [PermissionLevel.Supervisor]: 'L2 督導',
    [PermissionLevel.Manager]: 'L3 管理',
    [PermissionLevel.Admin]: 'L4 管理員',
    [PermissionLevel.SystemOwner]: 'L5 系統擁有者',
};

export function SidebarSettings({
    isOpen,
    navItems,
    onClose,
    onUpdateItem,
    onReorder,
    onReset,
}: SidebarSettingsProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [levelDropdownId, setLevelDropdownId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleStartEdit = (item: NavItemConfig) => {
        setEditingId(item.id);
        setEditValue(item.label);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSaveEdit = () => {
        if (editingId && editValue.trim()) {
            onUpdateItem(editingId, { label: editValue.trim() });
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditValue('');
        }
    };

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            onReorder(draggedIndex, dragOverIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // RBAC level change
    const handleLevelChange = (itemId: string, level: PermissionLevel) => {
        onUpdateItem(itemId, { minLevel: level });
        setLevelDropdownId(null);
    };

    // Group items by domain
    const getItemsByGroup = (group: NavGroup) => {
        return navItems
            .filter(item => item.group === group)
            .sort((a, b) => a.order - b.order);
    };

    // Get flat index for drag/drop
    const getFlatIndex = (item: NavItemConfig) => {
        return navItems.findIndex(i => i.id === item.id);
    };

    return (
        <>
            <div className="sidebar-settings__overlay" onClick={onClose} />
            <div className="sidebar-settings">
                <div className="sidebar-settings__header">
                    <h3>導航設定</h3>
                    <button className="sidebar-settings__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-settings__content">
                    <p className="sidebar-settings__hint">
                        拖曳調整順序 · 點擊名稱編輯 · 調整權限等級 · 共 {navItems.length} 個頁面
                    </p>

                    <div className="sidebar-settings__groups">
                        {NAV_GROUPS.map(group => {
                            const groupItems = getItemsByGroup(group.id);
                            if (groupItems.length === 0) return null;

                            const GroupIcon = ICON_MAP[group.icon];

                            return (
                                <div key={group.id} className="sidebar-settings__group">
                                    <div className="sidebar-settings__group-header">
                                        {GroupIcon && <GroupIcon size={16} />}
                                        <span>{group.label}</span>
                                        <span className="sidebar-settings__group-count">{groupItems.length}</span>
                                    </div>

                                    <div className="sidebar-settings__list">
                                        {groupItems.map((item) => {
                                            const flatIndex = getFlatIndex(item);
                                            const IconComponent = ICON_MAP[item.icon];
                                            const isDragging = draggedIndex === flatIndex;
                                            const isDragOver = dragOverIndex === flatIndex;
                                            const isLevelOpen = levelDropdownId === item.id;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`sidebar-settings__item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                                                    draggable
                                                    onDragStart={() => handleDragStart(flatIndex)}
                                                    onDragOver={(e) => handleDragOver(e, flatIndex)}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <div className="sidebar-settings__drag-handle">
                                                        <GripVertical size={16} />
                                                    </div>

                                                    <div className="sidebar-settings__icon">
                                                        {IconComponent && <IconComponent size={18} />}
                                                    </div>

                                                    {editingId === item.id ? (
                                                        <input
                                                            ref={inputRef}
                                                            className="sidebar-settings__input"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={handleKeyDown}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="sidebar-settings__label"
                                                            onClick={() => handleStartEdit(item)}
                                                        >
                                                            {item.label}
                                                        </span>
                                                    )}

                                                    {/* RBAC Level Selector */}
                                                    <div className="sidebar-settings__level-wrapper">
                                                        <button
                                                            className="sidebar-settings__level-btn"
                                                            onClick={() => setLevelDropdownId(isLevelOpen ? null : item.id)}
                                                            title="調整權限等級"
                                                        >
                                                            <Shield size={12} />
                                                            <span>L{item.minLevel ?? 0}</span>
                                                            <ChevronDown size={12} />
                                                        </button>
                                                        {isLevelOpen && (
                                                            <div className="sidebar-settings__level-dropdown">
                                                                {Object.entries(PERMISSION_LABELS).map(([level, label]) => (
                                                                    <button
                                                                        key={level}
                                                                        className={`sidebar-settings__level-option ${Number(level) === item.minLevel ? 'active' : ''}`}
                                                                        onClick={() => handleLevelChange(item.id, Number(level) as PermissionLevel)}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        className="sidebar-settings__visibility"
                                                        onClick={() => onUpdateItem(item.id, { visible: !item.visible })}
                                                        title={item.visible ? '隱藏' : '顯示'}
                                                    >
                                                        {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="sidebar-settings__footer">
                    <button className="sidebar-settings__reset" onClick={onReset}>
                        <RotateCcw size={14} />
                        重置為預設
                    </button>
                    <button className="sidebar-settings__done" onClick={onClose}>
                        <Check size={14} />
                        完成
                    </button>
                </div>
            </div>
        </>
    );
}
