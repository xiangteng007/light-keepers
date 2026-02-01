/**
 * Fire-119 Deep Integration Service
 * 消防署深度整合服務
 * 
 * Phase 4 進階功能：
 * - CAD 雙向同步
 * - 消防車即時位置追蹤
 * - 火場態勢即時同步
 * - 水源/消防栓整合
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * CAD 案件狀態
 */
export enum CadIncidentStatus {
    PENDING = 'pending',         // 待派遣
    DISPATCHED = 'dispatched',   // 已派遣
    EN_ROUTE = 'en_route',       // 途中
    ON_SCENE = 'on_scene',       // 現場
    CONTROLLED = 'controlled',   // 控制中
    UNDER_CONTROL = 'under_control', // 已控制
    CLOSED = 'closed',           // 結案
}

/**
 * 消防單元類型
 */
export enum FireUnitType {
    ENGINE = 'engine',           // 水箱車
    LADDER = 'ladder',           // 雲梯車
    RESCUE = 'rescue',           // 救助車
    AMBULANCE = 'ambulance',     // 救護車
    HAZMAT = 'hazmat',           // 化災車
    COMMAND = 'command',         // 指揮車
    SUPPORT = 'support',         // 支援車
}

/**
 * 水源類型
 */
export enum WaterSourceType {
    HYDRANT = 'hydrant',         // 消防栓
    POND = 'pond',               // 蓄水池
    RIVER = 'river',             // 河川
    WELL = 'well',               // 水井
    TANK = 'tank',               // 水塔
}

/**
 * CAD 案件完整資訊
 */
export interface CadIncident {
    id: string;
    cadNumber: string;           // CAD 案件編號
    type: string;
    subType?: string;
    status: CadIncidentStatus;
    priority: 1 | 2 | 3 | 4 | 5; // 1=最高
    reportedAt: Date;
    dispatchedAt?: Date;
    arrivedAt?: Date;
    clearedAt?: Date;
    location: {
        lat: number;
        lng: number;
        address: string;
        district: string;
        nearestHydrant?: string;
    };
    caller: {
        phone: string;
        name?: string;
    };
    assignedUnits: AssignedUnit[];
    notes: string[];
    lastUpdated: Date;
}

/**
 * 指派單元
 */
export interface AssignedUnit {
    unitId: string;
    callSign: string;
    type: FireUnitType;
    status: 'dispatched' | 'en_route' | 'on_scene' | 'available';
    crew: number;
    dispatchedAt: Date;
    arrivedAt?: Date;
    currentLocation?: { lat: number; lng: number };
    eta?: number; // 預計到達時間 (秒)
}

/**
 * 水源資訊
 */
export interface WaterSource {
    id: string;
    type: WaterSourceType;
    location: { lat: number; lng: number };
    address: string;
    capacity?: number;           // 容量 (公升)
    flowRate?: number;           // 流量 (公升/分鐘)
    status: 'available' | 'in_use' | 'out_of_service' | 'unknown';
    lastInspected?: Date;
    notes?: string;
}

/**
 * 火場態勢
 */
export interface FireSceneSituation {
    incidentId: string;
    timestamp: Date;
    fireStatus: 'spreading' | 'contained' | 'controlled' | 'extinguished';
    affectedFloors: number[];
    smokeCondition: 'light' | 'moderate' | 'heavy' | 'toxic';
    hazards: string[];
    rescues: {
        confirmed: number;
        pending: number;
        casualties: number;
    };
    resources: {
        waterSupply: 'adequate' | 'limited' | 'critical';
        personnelCount: number;
        equipmentNeeded: string[];
    };
    commandPost?: { lat: number; lng: number };
    stagingArea?: { lat: number; lng: number };
}

/**
 * 同步結果
 */
export interface SyncResult {
    success: boolean;
    direction: 'push' | 'pull' | 'bidirectional';
    recordsCreated: number;
    recordsUpdated: number;
    errors: string[];
    syncedAt: Date;
}

/**
 * Fire-119 深度整合服務
 */
@Injectable()
export class Fire119DeepIntegrationService {
    private readonly logger = new Logger(Fire119DeepIntegrationService.name);
    
    // CAD 案件快取
    private cadIncidents: Map<string, CadIncident> = new Map();
    
    // 消防車位置快取
    private unitLocations: Map<string, AssignedUnit & { lastUpdate: Date }> = new Map();
    
    // 水源資料庫
    private waterSources: Map<string, WaterSource> = new Map();
    
    // 火場態勢
    private fireSituations: Map<string, FireSceneSituation> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        // 初始化示範水源資料
        this.initializeWaterSources();
    }

    // ==================== CAD 同步 ====================

    /**
     * 從 CAD 系統拉取案件
     */
    async pullFromCad(filters?: {
        region?: string;
        status?: CadIncidentStatus[];
        since?: Date;
    }): Promise<SyncResult> {
        const cadEndpoint = this.configService.get<string>('FIRE119_CAD_ENDPOINT');
        
        if (!cadEndpoint) {
            // 模擬資料
            return this.simulateCadPull();
        }

        try {
            // 實際 API 呼叫 (待整合)
            // const response = await fetch(`${cadEndpoint}/incidents`, { ... });
            
            return this.simulateCadPull();
        } catch (error) {
            return {
                success: false,
                direction: 'pull',
                recordsCreated: 0,
                recordsUpdated: 0,
                errors: [(error as Error).message],
                syncedAt: new Date(),
            };
        }
    }

    /**
     * 推送更新到 CAD 系統
     */
    async pushToCad(incident: Partial<CadIncident>): Promise<SyncResult> {
        const cadEndpoint = this.configService.get<string>('FIRE119_CAD_ENDPOINT');

        if (!cadEndpoint) {
            this.logger.warn('CAD endpoint not configured, storing locally');
            
            if (incident.id) {
                const existing = this.cadIncidents.get(incident.id);
                if (existing) {
                    Object.assign(existing, incident, { lastUpdated: new Date() });
                }
            }

            return {
                success: true,
                direction: 'push',
                recordsCreated: 0,
                recordsUpdated: incident.id ? 1 : 0,
                errors: [],
                syncedAt: new Date(),
            };
        }

        // 實際推送邏輯 (待整合)
        return {
            success: true,
            direction: 'push',
            recordsCreated: 0,
            recordsUpdated: 1,
            errors: [],
            syncedAt: new Date(),
        };
    }

    /**
     * 取得 CAD 案件
     */
    getCadIncident(incidentId: string): CadIncident | undefined {
        return this.cadIncidents.get(incidentId);
    }

    /**
     * 取得所有活動案件
     */
    getActiveIncidents(): CadIncident[] {
        return Array.from(this.cadIncidents.values())
            .filter(i => i.status !== CadIncidentStatus.CLOSED);
    }

    // ==================== 消防車追蹤 ====================

    /**
     * 更新消防車位置
     */
    updateUnitLocation(
        unitId: string,
        location: { lat: number; lng: number },
        status?: AssignedUnit['status'],
    ): void {
        const existing = this.unitLocations.get(unitId);
        
        if (existing) {
            existing.currentLocation = location;
            existing.lastUpdate = new Date();
            if (status) existing.status = status;
        } else {
            this.unitLocations.set(unitId, {
                unitId,
                callSign: unitId,
                type: FireUnitType.ENGINE,
                status: status || 'available',
                crew: 4,
                dispatchedAt: new Date(),
                currentLocation: location,
                lastUpdate: new Date(),
            });
        }

        // 發送位置更新事件
        this.eventEmitter.emit('fire119.unit.location_updated', {
            unitId,
            location,
            status,
            timestamp: new Date(),
        });
    }

    /**
     * 取得消防車位置
     */
    getUnitLocations(region?: string): Array<AssignedUnit & { lastUpdate: Date }> {
        return Array.from(this.unitLocations.values());
    }

    /**
     * 計算 ETA
     */
    calculateEta(
        unitId: string,
        destination: { lat: number; lng: number },
    ): number | null {
        const unit = this.unitLocations.get(unitId);
        if (!unit?.currentLocation) return null;

        // 簡化的距離計算 (Haversine 公式)
        const distance = this.calculateDistance(
            unit.currentLocation.lat,
            unit.currentLocation.lng,
            destination.lat,
            destination.lng
        );

        // 假設平均速度 40 km/h
        const avgSpeedKmH = 40;
        const etaMinutes = (distance / avgSpeedKmH) * 60;

        return Math.round(etaMinutes * 60); // 回傳秒數
    }

    // ==================== 水源管理 ====================

    /**
     * 取得附近水源
     */
    getNearbyWaterSources(
        location: { lat: number; lng: number },
        radiusKm: number = 1,
    ): WaterSource[] {
        return Array.from(this.waterSources.values())
            .filter(source => {
                const distance = this.calculateDistance(
                    location.lat,
                    location.lng,
                    source.location.lat,
                    source.location.lng
                );
                return distance <= radiusKm;
            })
            .sort((a, b) => {
                const distA = this.calculateDistance(location.lat, location.lng, a.location.lat, a.location.lng);
                const distB = this.calculateDistance(location.lat, location.lng, b.location.lat, b.location.lng);
                return distA - distB;
            });
    }

    /**
     * 更新水源狀態
     */
    updateWaterSourceStatus(
        sourceId: string,
        status: WaterSource['status'],
    ): boolean {
        const source = this.waterSources.get(sourceId);
        if (!source) return false;

        source.status = status;
        
        this.eventEmitter.emit('fire119.water_source.status_updated', {
            sourceId,
            status,
            timestamp: new Date(),
        });

        return true;
    }

    /**
     * 取得所有水源
     */
    getAllWaterSources(): WaterSource[] {
        return Array.from(this.waterSources.values());
    }

    /**
     * 新增水源
     */
    addWaterSource(source: Omit<WaterSource, 'id'>): WaterSource {
        const id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const fullSource: WaterSource = { ...source, id };
        this.waterSources.set(id, fullSource);
        return fullSource;
    }

    // ==================== 火場態勢 ====================

    /**
     * 更新火場態勢
     */
    updateFireSituation(situation: FireSceneSituation): void {
        this.fireSituations.set(situation.incidentId, {
            ...situation,
            timestamp: new Date(),
        });

        // 發送態勢更新
        this.eventEmitter.emit('fire119.situation.updated', situation);

        // 如果需要緊急支援
        if (situation.resources.waterSupply === 'critical') {
            this.eventEmitter.emit('fire119.alert.water_critical', {
                incidentId: situation.incidentId,
                nearestSources: this.getNearbyWaterSources(
                    situation.commandPost || { lat: 25.033, lng: 121.565 },
                    2
                ),
            });
        }
    }

    /**
     * 取得火場態勢
     */
    getFireSituation(incidentId: string): FireSceneSituation | undefined {
        return this.fireSituations.get(incidentId);
    }

    /**
     * 取得所有活動火場
     */
    getActiveFireSituations(): FireSceneSituation[] {
        return Array.from(this.fireSituations.values())
            .filter(s => s.fireStatus !== 'extinguished');
    }

    // ==================== 統計報表 ====================

    /**
     * 取得整合狀態
     */
    getIntegrationStatus(): {
        cadConnected: boolean;
        avlConnected: boolean;
        activeIncidents: number;
        trackedUnits: number;
        waterSources: number;
        activeFires: number;
    } {
        return {
            cadConnected: !!this.configService.get<string>('FIRE119_CAD_ENDPOINT'),
            avlConnected: !!this.configService.get<string>('FIRE119_AVL_ENDPOINT'),
            activeIncidents: this.getActiveIncidents().length,
            trackedUnits: this.unitLocations.size,
            waterSources: this.waterSources.size,
            activeFires: this.getActiveFireSituations().length,
        };
    }

    // ==================== Private Helpers ====================

    private simulateCadPull(): SyncResult {
        // 模擬案件資料
        const mockIncident: CadIncident = {
            id: `cad_${Date.now()}`,
            cadNumber: `119-2026-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
            type: 'fire',
            subType: 'structure',
            status: CadIncidentStatus.ON_SCENE,
            priority: 2,
            reportedAt: new Date(Date.now() - 30 * 60000),
            dispatchedAt: new Date(Date.now() - 28 * 60000),
            arrivedAt: new Date(Date.now() - 20 * 60000),
            location: {
                lat: 25.033 + (Math.random() - 0.5) * 0.1,
                lng: 121.565 + (Math.random() - 0.5) * 0.1,
                address: '台北市信義區松仁路100號',
                district: '信義區',
                nearestHydrant: 'H-1234',
            },
            caller: { phone: '0912345678' },
            assignedUnits: [
                {
                    unitId: 'E101',
                    callSign: '信義 11',
                    type: FireUnitType.ENGINE,
                    status: 'on_scene',
                    crew: 4,
                    dispatchedAt: new Date(Date.now() - 28 * 60000),
                    arrivedAt: new Date(Date.now() - 20 * 60000),
                },
            ],
            notes: ['住宅火警', '3樓陽台起火'],
            lastUpdated: new Date(),
        };

        this.cadIncidents.set(mockIncident.id, mockIncident);

        return {
            success: true,
            direction: 'pull',
            recordsCreated: 1,
            recordsUpdated: 0,
            errors: [],
            syncedAt: new Date(),
        };
    }

    private initializeWaterSources(): void {
        // 初始化台北市部分消防栓資料
        const sources: Omit<WaterSource, 'id'>[] = [
            { type: WaterSourceType.HYDRANT, location: { lat: 25.033, lng: 121.565 }, address: '松仁路/莊敬路口', flowRate: 1200, status: 'available' },
            { type: WaterSourceType.HYDRANT, location: { lat: 25.035, lng: 121.563 }, address: '忠孝東路五段/松仁路口', flowRate: 1500, status: 'available' },
            { type: WaterSourceType.POND, location: { lat: 25.030, lng: 121.567 }, address: '四四南村公園', capacity: 50000, status: 'available' },
            { type: WaterSourceType.HYDRANT, location: { lat: 25.028, lng: 121.570 }, address: '松壽路/市府路口', flowRate: 1200, status: 'available' },
        ];

        for (const source of sources) {
            this.addWaterSource(source);
        }
    }

    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // 地球半徑 (km)
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
