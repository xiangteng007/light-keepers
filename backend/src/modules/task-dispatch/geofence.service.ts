/**
 * Geofence Service
 * Phase 2.2: Smart Geofencing - 自動化地理圍欄通知
 * 
 * 功能:
 * 1. 偵測志工進入/離開 Sector
 * 2. 自動推送 IAP 重點與 Hazard 告知
 * 3. 記錄移動軌跡
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface GeoPoint {
    lat: number;
    lng: number;
}

export interface GeofenceZone {
    id: string;
    name: string;
    missionSessionId: string;
    coordinates: GeoPoint[]; // Polygon vertices
    type: 'sector' | 'hazard' | 'rally' | 'restricted';
    iapHighlights?: string[];
    hazardInfo?: string;
    notifyOnEnter: boolean;
    notifyOnExit: boolean;
}

export interface GeofenceEvent {
    type: 'enter' | 'exit';
    zoneId: string;
    zoneName: string;
    zoneType: string;
    volunteerId: string;
    volunteerName?: string;
    location: GeoPoint;
    timestamp: Date;
    missionSessionId: string;
}

// ============ Service ============

@Injectable()
export class GeofenceService {
    private readonly logger = new Logger(GeofenceService.name);

    // In-memory zone storage (key: missionSessionId, value: zones[])
    private zones: Map<string, GeofenceZone[]> = new Map();

    // Track volunteer last known zone
    private volunteerZones: Map<string, Set<string>> = new Map(); // volunteerId -> Set<zoneId>

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) { }

    // ==================== Zone Management ====================

    /**
     * 註冊地理圍欄區域
     */
    registerZone(zone: GeofenceZone): void {
        const missionZones = this.zones.get(zone.missionSessionId) || [];

        // Check for duplicate
        const existingIndex = missionZones.findIndex(z => z.id === zone.id);
        if (existingIndex >= 0) {
            missionZones[existingIndex] = zone; // Update
        } else {
            missionZones.push(zone);
        }

        this.zones.set(zone.missionSessionId, missionZones);
        this.logger.log(`Zone registered: ${zone.name} (${zone.type}) in mission ${zone.missionSessionId}`);
    }

    /**
     * 批量註冊區域
     */
    registerZones(zones: GeofenceZone[]): void {
        zones.forEach(zone => this.registerZone(zone));
    }

    /**
     * 移除區域
     */
    removeZone(missionSessionId: string, zoneId: string): boolean {
        const missionZones = this.zones.get(missionSessionId);
        if (!missionZones) return false;

        const index = missionZones.findIndex(z => z.id === zoneId);
        if (index >= 0) {
            missionZones.splice(index, 1);
            this.logger.log(`Zone removed: ${zoneId}`);
            return true;
        }
        return false;
    }

    /**
     * 取得任務的所有區域
     */
    getZones(missionSessionId: string): GeofenceZone[] {
        return this.zones.get(missionSessionId) || [];
    }

    // ==================== Location Check ====================

    /**
     * 檢查位置並觸發事件
     * 每次志工上報位置時調用
     */
    checkLocation(
        volunteerId: string,
        volunteerName: string,
        location: GeoPoint,
        missionSessionId: string
    ): GeofenceEvent[] {
        const missionZones = this.zones.get(missionSessionId) || [];
        const currentZones = this.volunteerZones.get(volunteerId) || new Set<string>();
        const nowInZones = new Set<string>();
        const events: GeofenceEvent[] = [];

        for (const zone of missionZones) {
            const isInside = this.isPointInPolygon(location, zone.coordinates);

            if (isInside) {
                nowInZones.add(zone.id);

                // Check for ENTER event
                if (!currentZones.has(zone.id) && zone.notifyOnEnter) {
                    const event: GeofenceEvent = {
                        type: 'enter',
                        zoneId: zone.id,
                        zoneName: zone.name,
                        zoneType: zone.type,
                        volunteerId,
                        volunteerName,
                        location,
                        timestamp: new Date(),
                        missionSessionId,
                    };
                    events.push(event);
                    this.emitGeofenceEvent(event, zone);
                }
            }
        }

        // Check for EXIT events
        for (const zoneId of currentZones) {
            if (!nowInZones.has(zoneId)) {
                const zone = missionZones.find(z => z.id === zoneId);
                if (zone && zone.notifyOnExit) {
                    const event: GeofenceEvent = {
                        type: 'exit',
                        zoneId: zone.id,
                        zoneName: zone.name,
                        zoneType: zone.type,
                        volunteerId,
                        volunteerName,
                        location,
                        timestamp: new Date(),
                        missionSessionId,
                    };
                    events.push(event);
                    this.emitGeofenceEvent(event, zone);
                }
            }
        }

        // Update tracking
        this.volunteerZones.set(volunteerId, nowInZones);

        return events;
    }

    // ==================== Event Emission ====================

    /**
     * 發送 Geofence 事件
     */
    private emitGeofenceEvent(event: GeofenceEvent, zone: GeofenceZone): void {
        this.logger.log(
            `Geofence ${event.type.toUpperCase()}: ${event.volunteerName || event.volunteerId} ` +
            `${event.type === 'enter' ? '進入' : '離開'} ${zone.name}`
        );

        // Emit event for NotificationsService to handle
        this.eventEmitter.emit('geofence.triggered', {
            event,
            zone,
            notificationPayload: this.buildNotificationPayload(event, zone),
        });
    }

    /**
     * 建立通知內容
     */
    private buildNotificationPayload(event: GeofenceEvent, zone: GeofenceZone): {
        title: string;
        body: string;
        data: Record<string, any>;
    } {
        if (event.type === 'enter') {
            if (zone.type === 'hazard') {
                return {
                    title: '⚠️ 進入危險區域',
                    body: `${zone.hazardInfo || zone.name}`,
                    data: { zoneId: zone.id, type: 'hazard_warning' },
                };
            } else if (zone.type === 'sector') {
                const highlights = zone.iapHighlights?.join('\n• ') || '無特別注意事項';
                return {
                    title: `📍 進入 ${zone.name}`,
                    body: `IAP 重點:\n• ${highlights}`,
                    data: { zoneId: zone.id, type: 'iap_briefing' },
                };
            } else if (zone.type === 'rally') {
                return {
                    title: `🎯 抵達集結點: ${zone.name}`,
                    body: '請於此處待命等待指示',
                    data: { zoneId: zone.id, type: 'rally_point' },
                };
            }
        } else {
            // Exit event
            return {
                title: `👋 離開 ${zone.name}`,
                body: zone.type === 'hazard' ? '已離開危險區域' : '區域已記錄',
                data: { zoneId: zone.id, type: 'zone_exit' },
            };
        }

        return {
            title: `${event.type === 'enter' ? '進入' : '離開'}區域`,
            body: zone.name,
            data: { zoneId: zone.id },
        };
    }

    // ==================== Geometry Helpers ====================

    /**
     * 判斷點是否在多邊形內 (Ray Casting Algorithm)
     */
    private isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
        if (polygon.length < 3) return false;

        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].lng, yi = polygon[i].lat;
            const xj = polygon[j].lng, yj = polygon[j].lat;

            if (
                ((yi > point.lat) !== (yj > point.lat)) &&
                (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)
            ) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * 清除任務的所有區域資料
     */
    clearMission(missionSessionId: string): void {
        this.zones.delete(missionSessionId);
        this.logger.log(`Cleared all zones for mission: ${missionSessionId}`);
    }
}
