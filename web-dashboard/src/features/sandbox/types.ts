/**
 * 3D Sandbox Simulation Types and Utilities
 * 
 * Three.js based 3D visualization for disaster scenario simulation.
 */

export interface SandboxSceneConfig {
    width: number;
    height: number;
    backgroundColor: string;
    cameraPosition: { x: number; y: number; z: number };
    lighting: 'day' | 'night' | 'emergency';
}

export interface TerrainLayer {
    id: string;
    name: string;
    type: 'elevation' | 'satellite' | 'roads' | 'buildings';
    visible: boolean;
    opacity: number;
    data?: any;
}

export interface SimulationAsset {
    id: string;
    type: 'unit' | 'resource' | 'hazard' | 'marker';
    position: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: number;
    modelUrl?: string;
    color?: string;
    label?: string;
    metadata?: Record<string, any>;
}

export interface SimulationScenario {
    id: string;
    name: string;
    description: string;
    terrain: TerrainLayer[];
    assets: SimulationAsset[];
    timeline: TimelineEvent[];
    createdAt: Date;
    updatedAt: Date;
}

export interface TimelineEvent {
    id: string;
    timestamp: number; // seconds from start
    type: 'spawn' | 'move' | 'update' | 'remove' | 'annotation';
    targetId?: string;
    data: any;
}

/**
 * Default scene configuration
 */
export const DEFAULT_SCENE_CONFIG: SandboxSceneConfig = {
    width: 1200,
    height: 800,
    backgroundColor: '#87CEEB',
    cameraPosition: { x: 100, y: 100, z: 100 },
    lighting: 'day',
};

/**
 * Asset type models (placeholder URLs)
 */
export const ASSET_MODELS = {
    rescue_team: '/models/rescue_team.glb',
    medical_unit: '/models/medical_unit.glb',
    fire_truck: '/models/fire_truck.glb',
    helicopter: '/models/helicopter.glb',
    ambulance: '/models/ambulance.glb',
    supply_truck: '/models/supply_truck.glb',
    tent: '/models/tent.glb',
    barrier: '/models/barrier.glb',
    fire_marker: '/models/fire_marker.glb',
    flood_marker: '/models/flood_marker.glb',
    collapse_marker: '/models/collapse_marker.glb',
} as const;

/**
 * Scene camera presets
 */
export const CAMERA_PRESETS = {
    overview: { x: 200, y: 200, z: 200 },
    ground: { x: 50, y: 10, z: 50 },
    aerial: { x: 0, y: 300, z: 0 },
    side: { x: 300, y: 50, z: 0 },
} as const;

/**
 * Lighting configurations
 */
export const LIGHTING_CONFIGS = {
    day: {
        ambient: { color: '#ffffff', intensity: 0.6 },
        directional: { color: '#ffffff', intensity: 0.8, position: { x: 100, y: 100, z: 50 } },
    },
    night: {
        ambient: { color: '#1a1a2e', intensity: 0.2 },
        directional: { color: '#4a4a6a', intensity: 0.3, position: { x: 50, y: 80, z: 30 } },
    },
    emergency: {
        ambient: { color: '#ff4444', intensity: 0.4 },
        directional: { color: '#ff6666', intensity: 0.5, position: { x: 100, y: 100, z: 50 } },
    },
};

/**
 * Calculate distance between two points
 */
export function calculateDistance(
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number }
): number {
    return Math.sqrt(
        Math.pow(p2.x - p1.x, 2) +
        Math.pow(p2.y - p1.y, 2) +
        Math.pow(p2.z - p1.z, 2)
    );
}

/**
 * Interpolate position for animation
 */
export function interpolatePosition(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    t: number
): { x: number; y: number; z: number } {
    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        z: start.z + (end.z - start.z) * t,
    };
}

/**
 * Export scenario to shareable format
 */
export function exportScenario(scenario: SimulationScenario): string {
    return JSON.stringify(scenario, null, 2);
}

/**
 * Import scenario from JSON
 */
export function importScenario(json: string): SimulationScenario {
    const data = JSON.parse(json);
    return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
    };
}
