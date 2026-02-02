/**
 * AR Navigation Types and Utilities
 * 
 * Augmented Reality navigation for disaster field operations.
 * Uses WebXR API for AR experiences.
 */

/**
 * AR Navigation Point
 */
export interface ARNavigationPoint {
    id: string;
    name: string;
    type: 'destination' | 'waypoint' | 'hazard' | 'poi';
    position: {
        lat: number;
        lng: number;
        altitude?: number;
    };
    metadata?: {
        description?: string;
        priority?: number;
        icon?: string;
        color?: string;
    };
}

/**
 * AR Navigation Route
 */
export interface ARNavigationRoute {
    id: string;
    startPoint: ARNavigationPoint;
    endPoint: ARNavigationPoint;
    waypoints: ARNavigationPoint[];
    distance: number; // meters
    estimatedTime: number; // seconds
    hazards: ARHazardMarker[];
    safetyLevel: 'safe' | 'caution' | 'danger';
}

/**
 * AR Hazard Marker
 */
export interface ARHazardMarker {
    id: string;
    type: 'fire' | 'flood' | 'collapse' | 'gas' | 'radiation' | 'other';
    severity: 'low' | 'medium' | 'high' | 'extreme';
    position: {
        lat: number;
        lng: number;
    };
    radius: number; // meters
    message?: string;
    expiresAt?: Date;
}

/**
 * AR Session Configuration
 */
export interface ARSessionConfig {
    features: ('hit-test' | 'dom-overlay' | 'light-estimation')[];
    requiredFeatures?: string[];
    optionalFeatures?: string[];
    domOverlayElement?: Element;
}

/**
 * AR Object to render in scene
 */
export interface ARSceneObject {
    id: string;
    type: 'marker' | 'path' | 'label' | 'model';
    position: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    content: {
        modelUrl?: string;
        text?: string;
        color?: string;
        size?: number;
    };
    visible: boolean;
}

/**
 * Check WebXR AR support
 */
export async function checkARSupport(): Promise<boolean> {
    if (!navigator.xr) {
        return false;
    }
    
    try {
        return await navigator.xr.isSessionSupported('immersive-ar');
    } catch (error) {
        console.error('[AR] Support check failed:', error);
        return false;
    }
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
): number {
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;

    const x = Math.sin(dLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Convert GPS to local AR coordinates
 */
export function gpsToLocalCoords(
    origin: { lat: number; lng: number },
    target: { lat: number; lng: number }
): { x: number; z: number } {
    const distance = calculateDistance(origin, target);
    const bearing = calculateBearing(origin, target) * Math.PI / 180;
    
    return {
        x: distance * Math.sin(bearing),
        z: -distance * Math.cos(bearing),
    };
}

/**
 * Navigation instruction types
 */
export type NavigationInstruction = 
    | { type: 'straight'; distance: number }
    | { type: 'turn'; direction: 'left' | 'right'; angle: number }
    | { type: 'arrive'; destination: string }
    | { type: 'warning'; hazard: ARHazardMarker };

/**
 * Generate AR navigation instructions
 */
export function generateNavigation(
    currentPosition: { lat: number; lng: number },
    route: ARNavigationRoute
): NavigationInstruction[] {
    const instructions: NavigationInstruction[] = [];
    const points = [route.startPoint, ...route.waypoints, route.endPoint];
    
    let lastBearing = calculateBearing(currentPosition, points[0].position);
    
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const nextPoint = points[i + 1];
        
        if (nextPoint) {
            const distance = calculateDistance(point.position, nextPoint.position);
            const newBearing = calculateBearing(point.position, nextPoint.position);
            const bearingDiff = ((newBearing - lastBearing + 540) % 360) - 180;
            
            if (Math.abs(bearingDiff) > 20) {
                instructions.push({
                    type: 'turn',
                    direction: bearingDiff > 0 ? 'right' : 'left',
                    angle: Math.abs(bearingDiff),
                });
            }
            
            instructions.push({
                type: 'straight',
                distance,
            });
            
            lastBearing = newBearing;
        } else {
            instructions.push({
                type: 'arrive',
                destination: point.name,
            });
        }
        
        // Check for nearby hazards
        const nearbyHazards = route.hazards.filter(h => 
            calculateDistance(point.position, h.position) < h.radius + 50
        );
        
        for (const hazard of nearbyHazards) {
            instructions.push({
                type: 'warning',
                hazard,
            });
        }
    }
    
    return instructions;
}

/**
 * Hazard icon mappings
 */
export const HAZARD_ICONS: Record<ARHazardMarker['type'], string> = {
    fire: '🔥',
    flood: '🌊',
    collapse: '🏚️',
    gas: '☠️',
    radiation: '☢️',
    other: '⚠️',
};

/**
 * Severity colors
 */
export const SEVERITY_COLORS: Record<ARHazardMarker['severity'], string> = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    extreme: '#ef4444',
};
