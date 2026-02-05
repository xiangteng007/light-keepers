import { Injectable, Logger } from '@nestjs/common';

export interface TilesetConfig {
    id: string;
    url: string;
    type: '3dtiles' | 'terrain' | 'imagery';
    show: boolean;
    maximumScreenSpaceError?: number;
}

export interface CameraPosition {
    longitude: number;
    latitude: number;
    height: number;
    heading?: number;
    pitch?: number;
    roll?: number;
}

export interface Map3DLayer {
    id: string;
    name: string;
    type: 'buildings' | 'terrain' | 'imagery' | 'custom';
    visible: boolean;
    config: Record<string, unknown>;
}

@Injectable()
export class Map3DService {
    private readonly logger = new Logger(Map3DService.name);
    private layers: Map<string, Map3DLayer> = new Map();

    addLayer(layer: Map3DLayer): void {
        this.layers.set(layer.id, layer);
    }

    removeLayer(id: string): boolean {
        return this.layers.delete(id);
    }

    getLayers(): Map3DLayer[] {
        return Array.from(this.layers.values());
    }

    toggleLayer(id: string, visible: boolean): boolean {
        const layer = this.layers.get(id);
        if (!layer) return false;
        layer.visible = visible;
        return true;
    }

    getCesiumConfig(): {
        terrainProvider: { type: string; requestWaterMask: boolean; requestVertexNormals: boolean };
        imageryProviders: { type: string; defaultAlpha: number }[];
        layers: Map3DLayer[];
        defaultCamera: { destination: { longitude: number; latitude: number; height: number } };
    } {
        return {
            terrainProvider: {
                type: 'cesium-world-terrain',
                requestWaterMask: true,
                requestVertexNormals: true,
            },
            imageryProviders: [
                { type: 'bing-aerial', defaultAlpha: 1.0 },
            ],
            layers: this.getLayers().filter(l => l.visible),
            defaultCamera: {
                destination: { longitude: 121.5, latitude: 25.0, height: 50000 },
            },
        };
    }

    flyToPosition(camera: CameraPosition): {
        destination: { longitude: number; latitude: number; height: number };
        orientation: { heading: number; pitch: number; roll: number };
        duration: number;
    } {
        return {
            destination: {
                longitude: camera.longitude,
                latitude: camera.latitude,
                height: camera.height,
            },
            orientation: {
                heading: camera.heading || 0,
                pitch: camera.pitch || -90,
                roll: camera.roll || 0,
            },
            duration: 2,
        };
    }

    createBuildingTileset(url: string): TilesetConfig {
        return {
            id: `building-${Date.now()}`,
            url,
            type: '3dtiles',
            show: true,
            maximumScreenSpaceError: 16,
        };
    }

    highlightBuilding(buildingId: string, color: string = '#ff0000'): { conditions: [string, string][] } {
        return {
            conditions: [[`\${id} === '${buildingId}'`, `color('${color}')`]],
        };
    }
}
