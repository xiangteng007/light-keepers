/**
 * Geofencing Controller
 * REST API for geofence zone management
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GeofencingService, GeoZone, LocationPoint } from './geofencing.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

class CreateZoneDto {
    name: string;
    type: 'circle' | 'polygon';
    center?: { lat: number; lng: number };
    radius?: number;
    polygon?: Array<{ lat: number; lng: number }>;
    alertOnEntry?: boolean;
    alertOnExit?: boolean;
    alertMessage?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    active?: boolean;
    expiresAt?: string;
    metadata?: Record<string, any>;
}

class CheckLocationDto {
    lat: number;
    lng: number;
    accuracy?: number;
}

@Controller('geofence')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class GeofencingController {
    constructor(private geofencingService: GeofencingService) { }

    /**
     * Create a new geofence zone
     */
    @Post('zones')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async createZone(@Body() dto: CreateZoneDto) {
        const zone = await this.geofencingService.createZone({
            name: dto.name,
            type: dto.type,
            center: dto.center,
            radius: dto.radius,
            polygon: dto.polygon,
            alertOnEntry: dto.alertOnEntry ?? true,
            alertOnExit: dto.alertOnExit ?? false,
            alertMessage: dto.alertMessage,
            priority: dto.priority || 'medium',
            active: dto.active ?? true,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
            metadata: dto.metadata,
        });

        return { success: true, data: zone };
    }

    /**
     * Get all zones
     */
    @Get('zones')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getAllZones(@Query('active') active?: string) {
        const zones = active === 'true'
            ? await this.geofencingService.getActiveZones()
            : await this.geofencingService.getAllZones();

        return { success: true, data: zones };
    }

    /**
     * Get zone by ID
     */
    @Get('zones/:id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getZone(@Param('id') id: string) {
        const zone = await this.geofencingService.getZone(id);
        if (!zone) {
            return { success: false, error: 'Zone not found' };
        }
        return { success: true, data: zone };
    }

    /**
     * Update a zone
     */
    @Put('zones/:id')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async updateZone(@Param('id') id: string, @Body() dto: Partial<CreateZoneDto>) {
        const zone = await this.geofencingService.updateZone(id, {
            ...dto,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        } as Partial<GeoZone>);

        if (!zone) {
            return { success: false, error: 'Zone not found' };
        }
        return { success: true, data: zone };
    }

    /**
     * Delete a zone
     */
    @Delete('zones/:id')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async deleteZone(@Param('id') id: string) {
        const deleted = await this.geofencingService.deleteZone(id);
        return { success: deleted };
    }

    /**
     * Check current location against all zones
     */
    @Post('check')
    @RequiredLevel(ROLE_LEVELS.PUBLIC)
    async checkLocation(@Body() dto: CheckLocationDto) {
        const results = await this.geofencingService.checkLocation({
            lat: dto.lat,
            lng: dto.lng,
            accuracy: dto.accuracy,
            timestamp: new Date(),
        });

        const insideZones = results.filter(r => r.isInside);
        const nearbyZones = results.filter(r => !r.isInside && r.distance <= 1000); // Within 1km

        return {
            success: true,
            data: {
                insideZones: insideZones.map(r => ({
                    zone: r.zone,
                    distance: Math.round(r.distance),
                })),
                nearbyZones: nearbyZones.map(r => ({
                    zone: r.zone,
                    distance: Math.round(r.distance),
                })),
            },
        };
    }

    /**
     * Calculate distance between two points
     */
    @Post('distance')
    @RequiredLevel(ROLE_LEVELS.PUBLIC)
    async calculateDistance(
        @Body() body: { from: { lat: number; lng: number }; to: { lat: number; lng: number } }
    ) {
        const distance = this.geofencingService.calculateDistance(body.from, body.to);
        return {
            success: true,
            data: {
                distance: Math.round(distance),
                unit: 'meters',
            },
        };
    }
}
