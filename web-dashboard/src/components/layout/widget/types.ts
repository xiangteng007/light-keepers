/**
 * Widget Layout System - Core Type Definitions
 */

// Widget size presets
export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Grid position and dimensions
export interface WidgetPosition {
    x: number;  // Grid column position (0-based)
    y: number;  // Grid row position (0-based)
    w: number;  // Width in grid units
    h: number;  // Height in grid units
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}

// Individual widget configuration
export interface WidgetConfig {
    id: string;             // Unique identifier
    title: string;          // Display title
    region: string;         // Corresponding appshell-layout.md region
    icon?: string;          // Optional icon name
    visible: boolean;       // Is widget visible
    locked: boolean;        // Is widget position locked
    position: WidgetPosition;
    style?: 'card' | 'glass' | 'minimal';
}

// Complete layout configuration
export interface LayoutConfig {
    id: string;
    name: string;
    widgets: WidgetConfig[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

// User permission levels (using const object for compatibility)
export const PermissionLevel = {
    Anonymous: 0,
    Guest: 0,
    Volunteer: 1,
    TeamLead: 2,
    Supervisor: 2,    // Alias for TeamLead
    Coordinator: 3,
    Manager: 3,       // Alias for Coordinator
    Admin: 4,
    SystemOwner: 5,   // Only this level can edit widgets
} as const;

export type PermissionLevel = typeof PermissionLevel[keyof typeof PermissionLevel];

// Widget edit mode
export interface WidgetEditState {
    isEditMode: boolean;
    selectedWidgetId: string | null;
    dragEnabled: boolean;
    resizeEnabled: boolean;
}

// Available widget modules for Add Widget picker
export interface WidgetModule {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'map' | 'data' | 'tools' | 'community' | 'analytics' | 'core';
    defaultSize: { w: number; h: number; minW: number; minH: number };
}
