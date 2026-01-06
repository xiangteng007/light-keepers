/**
 * Tactical Maps Service
 * Phase 6.1: 3D 戰術沙盤
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TacticalMarker, MarkerCategory, MarkerType } from './entities';

// ============ Types ============

export interface ViewshedResult {
    markerId: string;
    visibleArea: number[][]; // Polygon coordinates
    blindSpots: number[][][]; // Array of polygon coordinates for blind spots
    coverage: number; // Percentage 0-100
}

export interface Building3D {
    id: string;
    name: string;
    coordinates: [number, number];
    height: number;
    footprint: number[][];
    modelUrl?: string;
    properties?: Record<string, any>;
}

// ============ Service ============

@Injectable()
export class TacticalMapsService {
    private readonly logger = new Logger(TacticalMapsService.name);

    constructor(
        @InjectRepository(TacticalMarker)
        private readonly markerRepository: Repository<TacticalMarker>,
    ) { }

    // ==================== CRUD ====================

    async createMarker(data: Partial<TacticalMarker>): Promise<TacticalMarker> {
        const marker = this.markerRepository.create(data);
        const saved = await this.markerRepository.save(marker);
        this.logger.log(`Tactical marker created: ${saved.name} (${saved.type})`);
        return saved;
    }

    async getMarker(id: string): Promise<TacticalMarker> {
        const marker = await this.markerRepository.findOne({ where: { id } });
        if (!marker) throw new NotFoundException('標記不存在');
        return marker;
    }

    async getMarkersByMission(missionSessionId: string): Promise<TacticalMarker[]> {
        return this.markerRepository.find({
            where: { missionSessionId, isVisible: true },
            order: { createdAt: 'DESC' },
        });
    }

    async updateMarker(id: string, data: Partial<TacticalMarker>): Promise<TacticalMarker> {
        const marker = await this.getMarker(id);
        Object.assign(marker, data);
        return this.markerRepository.save(marker);
    }

    async deleteMarker(id: string): Promise<void> {
        await this.markerRepository.delete(id);
    }

    // ==================== Batch Operations ====================

    async createBatch(markers: Partial<TacticalMarker>[]): Promise<TacticalMarker[]> {
        const entities = markers.map(m => this.markerRepository.create(m));
        return this.markerRepository.save(entities);
    }

    async deleteByMission(missionSessionId: string): Promise<number> {
        const result = await this.markerRepository.delete({ missionSessionId });
        return result.affected || 0;
    }

    // ==================== Viewshed Analysis ====================

    /**
     * 計算視域分析 (簡化版)
     * 實際應整合 Cesium Terrain Provider 或 GRASS GIS
     */
    async calculateViewshed(
        observerPosition: { lat: number; lng: number; height: number },
        params: {
            maxDistance: number; // meters
            horizontalAngle?: number; // degrees, default 360
            verticalAngleUp?: number; // degrees from horizontal
            verticalAngleDown?: number;
            resolution?: number; // meters per sample
        },
        obstacles?: Building3D[]
    ): Promise<ViewshedResult> {
        const {
            maxDistance,
            horizontalAngle = 360,
            resolution = 50,
        } = params;

        // Generate viewshed polygon (simplified circular for demo)
        const numPoints = Math.ceil(horizontalAngle / 10);
        const startAngle = horizontalAngle === 360 ? 0 : -horizontalAngle / 2;
        const visibleArea: number[][] = [];

        // Center point
        visibleArea.push([observerPosition.lng, observerPosition.lat]);

        // Generate arc points
        for (let i = 0; i <= numPoints; i++) {
            const angle = startAngle + (i * horizontalAngle / numPoints);
            const radians = (angle * Math.PI) / 180;

            // Calculate point at max distance (simplified, no terrain)
            const deltaLat = (maxDistance / 111320) * Math.cos(radians);
            const deltaLng = (maxDistance / (111320 * Math.cos(observerPosition.lat * Math.PI / 180))) * Math.sin(radians);

            visibleArea.push([
                observerPosition.lng + deltaLng,
                observerPosition.lat + deltaLat,
            ]);
        }

        // Close polygon
        visibleArea.push([observerPosition.lng, observerPosition.lat]);

        // Calculate blind spots from obstacles (simplified)
        const blindSpots: number[][][] = [];
        if (obstacles) {
            for (const obstacle of obstacles) {
                const distance = this.haversineDistance(
                    observerPosition.lat, observerPosition.lng,
                    obstacle.coordinates[1], obstacle.coordinates[0]
                );

                if (distance < maxDistance) {
                    // Shadow zone behind the building (simplified)
                    const shadowLength = Math.min(maxDistance - distance, obstacle.height * 2);
                    const bearing = this.calculateBearing(
                        observerPosition.lat, observerPosition.lng,
                        obstacle.coordinates[1], obstacle.coordinates[0]
                    );

                    // Create simplified shadow polygon
                    const shadow = this.createShadowPolygon(
                        obstacle.coordinates,
                        bearing,
                        shadowLength,
                        obstacle.footprint
                    );
                    if (shadow.length > 0) {
                        blindSpots.push(shadow);
                    }
                }
            }
        }

        // Calculate coverage percentage
        const coverage = blindSpots.length > 0
            ? Math.max(50, 100 - blindSpots.length * 5)
            : 100;

        return {
            markerId: `viewshed-${Date.now()}`,
            visibleArea,
            blindSpots,
            coverage,
        };
    }

    // ==================== MIL-STD-2525 Helpers ====================

    /**
     * 生成 MIL-STD-2525D SIDC
     */
    generateSIDC(
        affiliation: 'friend' | 'hostile' | 'neutral' | 'unknown',
        dimension: 'ground' | 'air' | 'sea' | 'space',
        functionId: string = '------'
    ): string {
        // Version: 10 (2525D), Context: Reality
        const version = '10';
        const context = '0'; // Reality

        // Standard Identity
        const siMap: Record<string, string> = {
            'friend': '3',
            'hostile': '6',
            'neutral': '4',
            'unknown': '1',
        };
        const standardIdentity = siMap[affiliation] || '1';

        // Symbol Set
        const ssMap: Record<string, string> = {
            'ground': '10', // Land Unit
            'air': '01',    // Air
            'sea': '30',    // Sea Surface
            'space': '05',  // Space
        };
        const symbolSet = ssMap[dimension] || '10';

        // Entity/Type/Subtype (simplified)
        const entity = functionId.substring(0, 2) || '11';
        const type = functionId.substring(2, 4) || '00';
        const subtype = functionId.substring(4, 6) || '00';

        return `${version}${context}${standardIdentity}${symbolSet}${entity}${type}${subtype}0000`;
    }

    // ==================== Helper Methods ====================

    private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    private createShadowPolygon(
        center: [number, number],
        bearing: number,
        length: number,
        footprint?: number[][]
    ): number[][] {
        // Simplified shadow polygon
        const width = 20; // meters
        const bearingRad = (bearing * Math.PI) / 180;

        const deltaLat = (length / 111320) * Math.cos(bearingRad);
        const deltaLng = (length / (111320 * Math.cos(center[1] * Math.PI / 180))) * Math.sin(bearingRad);

        const perpBearing = bearing + 90;
        const perpRad = (perpBearing * Math.PI) / 180;
        const perpDeltaLat = (width / 111320) * Math.cos(perpRad);
        const perpDeltaLng = (width / (111320 * Math.cos(center[1] * Math.PI / 180))) * Math.sin(perpRad);

        return [
            [center[0] - perpDeltaLng, center[1] - perpDeltaLat],
            [center[0] + perpDeltaLng, center[1] + perpDeltaLat],
            [center[0] + deltaLng + perpDeltaLng, center[1] + deltaLat + perpDeltaLat],
            [center[0] + deltaLng - perpDeltaLng, center[1] + deltaLat - perpDeltaLat],
            [center[0] - perpDeltaLng, center[1] - perpDeltaLat],
        ];
    }
}
