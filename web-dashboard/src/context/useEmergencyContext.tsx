/**
 * useEmergencyContext.ts
 * 
 * Expert Council Navigation Design v3.0
 * Context-aware navigation hook for emergency state management
 * Per expert_council_navigation_design.md §3.3
 */
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// Emergency levels matching backend incident severity
export enum EmergencyLevel {
    Normal = 0,      // 正常狀態
    Advisory = 1,    // 注意 (Yellow)
    Warning = 2,     // 警告 (Orange)  
    Emergency = 3,   // 緊急 (Red)
    Critical = 4,    // 危機 (Purple)
}

// Active incident interface
export interface ActiveIncident {
    id: string;
    title: string;
    type: string;
    level: EmergencyLevel;
    startTime: Date;
    location?: string;
    affectedAreas?: string[];
    commandPost?: string;
}

// Emergency context state
interface EmergencyContextState {
    // Active incident state
    hasActiveIncident: boolean;
    activeIncidents: ActiveIncident[];
    currentIncident: ActiveIncident | null;
    emergencyLevel: EmergencyLevel;
    
    // User role state
    isOnDuty: boolean;
    assignedRole?: string;  // ICS role assignment
    assignedSection?: 'command' | 'operations' | 'planning' | 'logistics' | 'finance';
    
    // Actions
    setIncident: (incident: ActiveIncident | null) => void;
    addIncident: (incident: ActiveIncident) => void;
    removeIncident: (id: string) => void;
    setOnDuty: (onDuty: boolean) => void;
    setAssignment: (role: string, section: EmergencyContextState['assignedSection']) => void;
    
    // Navigation helpers
    getQuickActions: () => QuickAction[];
    getPriorityRoutes: () => string[];
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    path: string;
    variant: 'critical' | 'warning' | 'info';
    visible: boolean;
}

// Default context value
const defaultContext: EmergencyContextState = {
    hasActiveIncident: false,
    activeIncidents: [],
    currentIncident: null,
    emergencyLevel: EmergencyLevel.Normal,
    isOnDuty: false,
    assignedRole: undefined,
    assignedSection: undefined,
    setIncident: () => {},
    addIncident: () => {},
    removeIncident: () => {},
    setOnDuty: () => {},
    setAssignment: () => {},
    getQuickActions: () => [],
    getPriorityRoutes: () => [],
};

const EmergencyContext = createContext<EmergencyContextState>(defaultContext);

// Storage key for persistence
const STORAGE_KEY = 'lk_emergency_context';

// Provider component
export function EmergencyProvider({ children }: { children: ReactNode }) {
    const [activeIncidents, setActiveIncidents] = useState<ActiveIncident[]>([]);
    const [currentIncident, setCurrentIncident] = useState<ActiveIncident | null>(null);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [assignedRole, setAssignedRole] = useState<string>();
    const [assignedSection, setAssignedSection] = useState<EmergencyContextState['assignedSection']>();

    // Initialize from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.activeIncidents) {
                    setActiveIncidents(parsed.activeIncidents.map((i: ActiveIncident) => ({
                        ...i,
                        startTime: new Date(i.startTime),
                    })));
                }
                if (parsed.isOnDuty !== undefined) setIsOnDuty(parsed.isOnDuty);
                if (parsed.assignedRole) setAssignedRole(parsed.assignedRole);
                if (parsed.assignedSection) setAssignedSection(parsed.assignedSection);
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                activeIncidents,
                isOnDuty,
                assignedRole,
                assignedSection,
            }));
        } catch {
            // Ignore storage errors
        }
    }, [activeIncidents, isOnDuty, assignedRole, assignedSection]);

    // Derived state
    const hasActiveIncident = activeIncidents.length > 0;
    const emergencyLevel = activeIncidents.reduce(
        (max, i) => Math.max(max, i.level),
        EmergencyLevel.Normal
    ) as EmergencyLevel;

    // Actions
    const setIncident = useCallback((incident: ActiveIncident | null) => {
        setCurrentIncident(incident);
        if (incident && !activeIncidents.find(i => i.id === incident.id)) {
            setActiveIncidents(prev => [...prev, incident]);
        }
    }, [activeIncidents]);

    const addIncident = useCallback((incident: ActiveIncident) => {
        setActiveIncidents(prev => {
            if (prev.find(i => i.id === incident.id)) return prev;
            return [...prev, incident];
        });
    }, []);

    const removeIncident = useCallback((id: string) => {
        setActiveIncidents(prev => prev.filter(i => i.id !== id));
        if (currentIncident?.id === id) {
            setCurrentIncident(null);
        }
    }, [currentIncident]);

    const setOnDuty = useCallback((onDuty: boolean) => {
        setIsOnDuty(onDuty);
    }, []);

    const setAssignment = useCallback((role: string, section: EmergencyContextState['assignedSection']) => {
        setAssignedRole(role);
        setAssignedSection(section);
    }, []);

    // Navigation helpers
    const getQuickActions = useCallback((): QuickAction[] => {
        const actions: QuickAction[] = [
            {
                id: 'sos',
                label: 'SOS 發送',
                icon: 'AlertCircle',
                path: '/emergency/sos',
                variant: 'critical',
                visible: true,
            },
            {
                id: 'report',
                label: '快速通報',
                icon: 'FileText',
                path: '/intake',
                variant: 'warning',
                visible: true,
            },
            {
                id: 'evacuate',
                label: '撤離警報',
                icon: 'LogOut',
                path: '/emergency/evacuate',
                variant: 'warning',
                visible: hasActiveIncident && emergencyLevel >= EmergencyLevel.Warning,
            },
            {
                id: 'hotline',
                label: '緊急專線',
                icon: 'Phone',
                path: '/emergency/hotline',
                variant: 'info',
                visible: true,
            },
        ];
        return actions.filter(a => a.visible);
    }, [hasActiveIncident, emergencyLevel]);

    const getPriorityRoutes = useCallback((): string[] => {
        const routes: string[] = [];
        
        // Always include command center
        routes.push('/command-center');
        
        if (hasActiveIncident) {
            // During incidents, prioritize operational routes
            routes.push('/rescue/shelters');
            routes.push('/rescue/triage');
            routes.push('/geo/map');
        }
        
        // Section-specific routes
        if (assignedSection === 'operations') {
            routes.push('/ops/ics-forms');
            routes.push('/rescue/search-rescue');
        } else if (assignedSection === 'logistics') {
            routes.push('/logistics/inventory');
            routes.push('/logistics/equipment');
        } else if (assignedSection === 'planning') {
            routes.push('/analytics/reports');
        }
        
        return routes;
    }, [hasActiveIncident, assignedSection]);

    const value: EmergencyContextState = {
        hasActiveIncident,
        activeIncidents,
        currentIncident,
        emergencyLevel,
        isOnDuty,
        assignedRole,
        assignedSection,
        setIncident,
        addIncident,
        removeIncident,
        setOnDuty,
        setAssignment,
        getQuickActions,
        getPriorityRoutes,
    };

    return (
        <EmergencyContext.Provider value={value}>
            {children}
        </EmergencyContext.Provider>
    );
}

// Hook to use emergency context
export function useEmergencyContext() {
    const context = useContext(EmergencyContext);
    if (!context) {
        throw new Error('useEmergencyContext must be used within EmergencyProvider');
    }
    return context;
}

// Utility hook for emergency level styling
export function useEmergencyStyles() {
    const { emergencyLevel } = useEmergencyContext();
    
    const getEmergencyColor = () => {
        switch (emergencyLevel) {
            case EmergencyLevel.Critical: return '#9333EA'; // Purple
            case EmergencyLevel.Emergency: return '#EF4444'; // Red
            case EmergencyLevel.Warning: return '#F59E0B'; // Orange
            case EmergencyLevel.Advisory: return '#EAB308'; // Yellow
            default: return '#10B981'; // Green
        }
    };
    
    const getEmergencyLabel = () => {
        switch (emergencyLevel) {
            case EmergencyLevel.Critical: return '危機';
            case EmergencyLevel.Emergency: return '緊急';
            case EmergencyLevel.Warning: return '警告';
            case EmergencyLevel.Advisory: return '注意';
            default: return '正常';
        }
    };
    
    return {
        color: getEmergencyColor(),
        label: getEmergencyLabel(),
        level: emergencyLevel,
        isActive: emergencyLevel > EmergencyLevel.Normal,
    };
}

export default EmergencyContext;
