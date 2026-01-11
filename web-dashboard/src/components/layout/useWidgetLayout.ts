/**
 * useWidgetLayout Hook
 * 
 * Manages widget layout state with RBAC permission checking
 * Only Level 5 (SystemOwner) can modify layout
 * Each page has its own independent widget configuration (via pageId)
 */
import { useState, useEffect, useCallback } from 'react';
// Using 'any' for react-grid-layout Layout type compatibility
type LayoutItem = any;
import {
    WidgetConfig,
    WidgetEditState,
    PermissionLevel,
    DEFAULT_WIDGETS,
    WidgetModule,
} from './widget.types';

const STORAGE_KEY_PREFIX = 'lightkeepers-widget-layout';

interface UseWidgetLayoutOptions {
    userLevel: PermissionLevel;
    pageId?: string;  // Page-specific identifier for independent widget configs
}

interface UseWidgetLayoutReturn {
    widgets: WidgetConfig[];
    editState: WidgetEditState;
    canEdit: boolean;
    gridLayout: LayoutItem[];
    toggleEditMode: () => void;
    updateLayout: (layout: LayoutItem[]) => void;
    updateWidgetTitle: (widgetId: string, newTitle: string) => void;
    addWidget: (module: WidgetModule) => void;  // NEW
    removeWidget: (widgetId: string) => void;   // NEW
    toggleWidgetVisibility: (widgetId: string) => void;
    toggleWidgetLock: (widgetId: string) => void;
    resetLayout: () => void;
    selectWidget: (widgetId: string | null) => void;
}

export function useWidgetLayout({ userLevel, pageId = 'default' }: UseWidgetLayoutOptions): UseWidgetLayoutReturn {
    // Page-specific storage key
    const storageKey = `${STORAGE_KEY_PREFIX}-${pageId}`;

    // Permission check - only Level 5 can edit
    const canEdit = userLevel >= PermissionLevel.SystemOwner;

    // Widget state
    const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return DEFAULT_WIDGETS;
            }
        }
        return DEFAULT_WIDGETS;
    });

    // Edit mode state
    const [editState, setEditState] = useState<WidgetEditState>({
        isEditMode: false,
        selectedWidgetId: null,
        dragEnabled: false,
        resizeEnabled: false,
    });

    // Persist layout changes (page-specific)
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(widgets));
    }, [widgets, storageKey]);

    // Convert widgets to react-grid-layout format
    const gridLayout = widgets
        .filter(w => w.visible)
        .map(w => ({
            i: w.id,
            x: w.position.x,
            y: w.position.y,
            w: w.position.w,
            h: w.position.h,
            minW: w.position.minW,
            minH: w.position.minH,
            maxW: w.position.maxW,
            maxH: w.position.maxH,
            isDraggable: canEdit && editState.isEditMode && !w.locked,
            isResizable: canEdit && editState.isEditMode && !w.locked,
            static: w.locked || !editState.isEditMode,
        }));

    // Toggle edit mode (only if permitted)
    const toggleEditMode = useCallback(() => {
        if (!canEdit) return;
        setEditState(prev => ({
            ...prev,
            isEditMode: !prev.isEditMode,
            dragEnabled: !prev.isEditMode,
            resizeEnabled: !prev.isEditMode,
            selectedWidgetId: null,
        }));
    }, [canEdit]);

    // Update layout after drag/resize
    const updateLayout = useCallback((layout: LayoutItem[]) => {
        if (!canEdit || !editState.isEditMode) return;

        setWidgets(prev => prev.map(widget => {
            const layoutItem = layout.find(l => l.i === widget.id);
            if (layoutItem) {
                return {
                    ...widget,
                    position: {
                        ...widget.position,
                        x: layoutItem.x,
                        y: layoutItem.y,
                        w: layoutItem.w,
                        h: layoutItem.h,
                    },
                };
            }
            return widget;
        }));
    }, [canEdit, editState.isEditMode]);

    // Update widget title (NEW)
    const updateWidgetTitle = useCallback((widgetId: string, newTitle: string) => {
        if (!canEdit) return;
        setWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, title: newTitle } : w
        ));
    }, [canEdit]);

    // Toggle widget visibility
    const toggleWidgetVisibility = useCallback((widgetId: string) => {
        if (!canEdit) return;
        setWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, visible: !w.visible } : w
        ));
    }, [canEdit]);

    // Toggle widget lock
    const toggleWidgetLock = useCallback((widgetId: string) => {
        if (!canEdit) return;
        setWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, locked: !w.locked } : w
        ));
    }, [canEdit]);

    // Reset to default layout
    const resetLayout = useCallback(() => {
        if (!canEdit) return;
        setWidgets(DEFAULT_WIDGETS);
    }, [canEdit]);

    // Add new widget from module picker
    const addWidget = useCallback((module: WidgetModule) => {
        if (!canEdit) return;

        // Generate unique ID with timestamp
        const newWidgetId = `${module.id}-${Date.now()}`;

        // Find available position (bottom of grid)
        const maxY = widgets.reduce((max, w) => Math.max(max, w.position.y + w.position.h), 0);

        const newWidget: WidgetConfig = {
            id: newWidgetId,
            title: module.title,
            region: 'custom',
            visible: true,
            locked: false,
            position: {
                x: 0,
                y: maxY,
                w: module.defaultSize.w,
                h: module.defaultSize.h,
                minW: module.defaultSize.minW,
                minH: module.defaultSize.minH,
            },
            style: 'card',
        };

        setWidgets(prev => [...prev, newWidget]);
    }, [canEdit, widgets]);

    // Remove widget
    const removeWidget = useCallback((widgetId: string) => {
        if (!canEdit) return;
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
    }, [canEdit]);

    // Select widget for editing
    const selectWidget = useCallback((widgetId: string | null) => {
        setEditState(prev => ({ ...prev, selectedWidgetId: widgetId }));
    }, []);

    return {
        widgets,
        editState,
        canEdit,
        gridLayout,
        toggleEditMode,
        updateLayout,
        updateWidgetTitle,
        addWidget,
        removeWidget,
        toggleWidgetVisibility,
        toggleWidgetLock,
        resetLayout,
        selectWidget,
    };
}

