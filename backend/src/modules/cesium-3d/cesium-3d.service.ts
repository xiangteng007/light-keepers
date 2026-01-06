/**
 * Cesium 3D Service - CesiumJS 3D 戰術沙盤
 * 中期擴展功能
 */

import { Injectable, Logger } from '@nestjs/common';

// ============ Types ============

export interface TerrainProvider {
    id: string;
    name: string;
    type: 'cesium' | 'arcgis' | 'custom';
    url: string;
    accessToken?: string;
}

export interface Building3D {
    id: string;
    name: string;
    position: { lat: number; lng: number; height: number };
    dimensions: { width: number; depth: number; height: number };
    rotation?: number;
    modelUrl?: string;
    tileset?: string;
    color?: string;
    properties?: Record<string, any>;
}

export interface ViewshedAnalysis {
    id: string;
    observerPosition: { lat: number; lng: number; height: number };
    parameters: {
        maxDistance: number;
        horizontalFov: number;
        verticalFovUp: number;
        verticalFovDown: number;
        gridResolution: number;
    };
    result?: {
        visibleArea: number[][]; // GeoJSON polygon
        coveragePercent: number;
        blindSpots: number[][][];
        computedAt: Date;
    };
}

export interface FlightPath {
    id: string;
    droneId: string;
    waypoints: { lat: number; lng: number; altitude: number; timestamp?: Date }[];
    currentPosition?: number; // Index in waypoints
    status: 'planned' | 'active' | 'completed';
}

// ============ Service ============

@Injectable()
export class Cesium3dService {
    private readonly logger = new Logger(Cesium3dService.name);

    // ==================== Configuration ====================

    /**
     * 取得 Cesium Ion 配置
     */
    getCesiumConfig(): {
        accessToken: string;
        defaultView: { lat: number; lng: number; height: number };
        terrainProviders: TerrainProvider[];
    } {
        return {
            accessToken: process.env.CESIUM_ION_TOKEN || 'demo-token',
            defaultView: {
                lat: 23.5,
                lng: 121.0,
                height: 500000, // 500km for Taiwan overview
            },
            terrainProviders: [
                {
                    id: 'cesium-world',
                    name: 'Cesium World Terrain',
                    type: 'cesium',
                    url: 'https://assets.cesium.com/1/',
                },
                {
                    id: 'taiwan-dem',
                    name: '台灣 DEM',
                    type: 'custom',
                    url: '/api/terrain/taiwan',
                },
            ],
        };
    }

    // ==================== 3D Buildings ====================

    /**
     * 載入 3D Tileset (建築模型)
     */
    get3DTilesets(region: string): { url: string; name: string }[] {
        const tilesets: Record<string, { url: string; name: string }[]> = {
            taipei: [
                { url: '/api/tiles/3d/taipei-city', name: '台北市建築' },
                { url: '/api/tiles/3d/taipei-landmarks', name: '台北地標' },
            ],
            taichung: [
                { url: '/api/tiles/3d/taichung-city', name: '台中市建築' },
            ],
            kaohsiung: [
                { url: '/api/tiles/3d/kaohsiung-city', name: '高雄市建築' },
            ],
        };
        return tilesets[region] || [];
    }

    /**
     * 建立自訂建築
     */
    createBuilding(data: Omit<Building3D, 'id'>): Building3D {
        const building: Building3D = {
            id: `bld-${Date.now()}`,
            ...data,
        };
        this.logger.log(`3D Building created: ${building.name}`);
        return building;
    }

    // ==================== Viewshed Analysis ====================

    /**
     * 計算視域分析
     * 實際實作需使用 Cesium 的視域分析工具
     */
    calculateViewshed(
        observer: { lat: number; lng: number; height: number },
        params: ViewshedAnalysis['parameters'],
        buildings?: Building3D[]
    ): ViewshedAnalysis {
        const id = `vs-${Date.now()}`;

        // Generate simplified viewshed (actual impl needs terrain data)
        const visibleArea = this.generateViewshedPolygon(
            observer,
            params.maxDistance,
            params.horizontalFov
        );

        // Simplified blind spot calculation
        const blindSpots: number[][][] = [];
        if (buildings) {
            for (const building of buildings) {
                const distance = this.calculateDistance(
                    observer.lat, observer.lng,
                    building.position.lat, building.position.lng
                );
                if (distance < params.maxDistance && building.dimensions.height > observer.height) {
                    const shadow = this.calculateBuildingShadow(observer, building, params.maxDistance);
                    if (shadow.length > 0) blindSpots.push(shadow);
                }
            }
        }

        const coverage = Math.max(50, 100 - blindSpots.length * 5);

        return {
            id,
            observerPosition: observer,
            parameters: params,
            result: {
                visibleArea,
                coveragePercent: coverage,
                blindSpots,
                computedAt: new Date(),
            },
        };
    }

    private generateViewshedPolygon(
        center: { lat: number; lng: number },
        maxDistance: number,
        horizontalFov: number
    ): number[][] {
        const points: number[][] = [[center.lng, center.lat]];
        const startAngle = -horizontalFov / 2;
        const numPoints = Math.ceil(horizontalFov / 5);

        for (let i = 0; i <= numPoints; i++) {
            const angle = startAngle + (i * horizontalFov / numPoints);
            const rad = (angle * Math.PI) / 180;
            const dLat = (maxDistance / 111320) * Math.cos(rad);
            const dLng = (maxDistance / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(rad);
            points.push([center.lng + dLng, center.lat + dLat]);
        }

        points.push([center.lng, center.lat]);
        return points;
    }

    private calculateBuildingShadow(
        observer: { lat: number; lng: number; height: number },
        building: Building3D,
        maxDistance: number
    ): number[][] {
        // Simplified shadow calculation
        const bearing = this.calculateBearing(
            observer.lat, observer.lng,
            building.position.lat, building.position.lng
        );
        const shadowLength = Math.min(
            maxDistance * 0.3,
            building.dimensions.height * 2
        );

        const rad = (bearing * Math.PI) / 180;
        const dLat = (shadowLength / 111320) * Math.cos(rad);
        const dLng = (shadowLength / (111320 * Math.cos(building.position.lat * Math.PI / 180))) * Math.sin(rad);

        return [
            [building.position.lng - 0.001, building.position.lat - 0.001],
            [building.position.lng + 0.001, building.position.lat - 0.001],
            [building.position.lng + dLng + 0.001, building.position.lat + dLat + 0.001],
            [building.position.lng + dLng - 0.001, building.position.lat + dLat - 0.001],
        ];
    }

    // ==================== Flight Visualization ====================

    /**
     * 建立無人機飛行路徑
     */
    createFlightPath(droneId: string, waypoints: FlightPath['waypoints']): FlightPath {
        return {
            id: `fp-${Date.now()}`,
            droneId,
            waypoints,
            currentPosition: 0,
            status: 'planned',
        };
    }

    /**
     * 取得 CZML 格式的飛行路徑 (Cesium 動畫格式)
     */
    toFlightCZML(path: FlightPath): any[] {
        const czml: any[] = [
            {
                id: 'document',
                name: `Flight Path ${path.id}`,
                version: '1.0',
            },
        ];

        // Path line
        const positions: number[] = [];
        for (const wp of path.waypoints) {
            positions.push(wp.lng, wp.lat, wp.altitude);
        }

        czml.push({
            id: path.id,
            name: `Drone ${path.droneId}`,
            polyline: {
                positions: {
                    cartographicDegrees: positions,
                },
                material: {
                    solidColor: {
                        color: { rgba: [59, 130, 246, 200] },
                    },
                },
                width: 3,
                clampToGround: false,
            },
        });

        return czml;
    }

    // ==================== Helpers ====================

    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
}
