/**
 * INSARAG Marking Service
 * 國際搜救標記服務
 * 
 * Phase 4 進階功能：
 * - 建築評估標記
 * - 傷亡符號
 * - 危害指示
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 建築結構狀態 (INSARAG 四象限標記)
 */
export enum StructureStatus {
    GO = 'go',                   // 可進入搜救
    GO_CAUTION = 'go_caution',   // 可進入但需注意
    NO_GO = 'no_go',             // 禁止進入
    ASSESSED = 'assessed',       // 已評估 (無傷亡)
}

/**
 * 危害類型
 */
export enum HazardType {
    COLLAPSE_RISK = 'collapse_risk',     // 倒塌風險
    FIRE = 'fire',                       // 火災
    FLOOD = 'flood',                     // 淹水
    GAS_LEAK = 'gas_leak',               // 瓦斯洩漏
    HAZMAT = 'hazmat',                   // 危險物質
    ELECTRICAL = 'electrical',           // 電力危險
    ASBESTOS = 'asbestos',               // 石綿
    UNSTABLE = 'unstable',               // 結構不穩
    CONFINED_SPACE = 'confined_space',   // 受限空間
}

/**
 * 傷亡狀態
 */
export enum VictimStatus {
    ALIVE_HEARD = 'alive_heard',         // 有聲音/存活
    ALIVE_SEEN = 'alive_seen',           // 可見/存活
    DECEASED = 'deceased',               // 死亡
    UNKNOWN = 'unknown',                 // 未知
    EVACUATED = 'evacuated',             // 已撤離
}

/**
 * INSARAG 建築標記
 */
export interface InsaragMarking {
    id: string;
    structureId: string;
    structureAddress: string;
    location: { lat: number; lng: number };
    
    // 四象限標記
    quadrant1_structureInfo: {
        type: string;           // 建築類型
        floors: number;         // 樓層數
        basements?: number;     // 地下室
        constructionType: string; // RC/木造/磚造等
    };
    
    quadrant2_hazards: {
        hazards: HazardType[];
        details: string;
    };
    
    quadrant3_victims: {
        confirmed: {
            alive: number;
            deceased: number;
        };
        estimated?: {
            alive: number;
            deceased: number;
        };
        locations: string[];    // 受困位置
    };
    
    quadrant4_teams: {
        teamName: string;       // 搜救隊名稱
        entryTime: Date;        // 進入時間
        exitTime?: Date;        // 離開時間
        status: 'searching' | 'completed' | 'suspended';
    }[];
    
    overallStatus: StructureStatus;
    markedAt: Date;
    markedBy: string;
    lastUpdated: Date;
    photos?: string[];
}

/**
 * 傷亡標記
 */
export interface VictimMarking {
    id: string;
    structureId: string;
    location: {
        floor: number | string;
        room?: string;
        description: string;
        coordinates?: { lat: number; lng: number };
    };
    status: VictimStatus;
    count: number;
    detailsKnown: {
        age?: 'child' | 'adult' | 'elderly';
        gender?: 'male' | 'female' | 'unknown';
        condition?: string;
        trapped?: boolean;
        accessMethod?: string;
    };
    markedAt: Date;
    markedBy: string;
    rescuedAt?: Date;
    rescuedBy?: string;
}

/**
 * 危害標記
 */
export interface HazardMarking {
    id: string;
    structureId?: string;
    location: { lat: number; lng: number };
    type: HazardType;
    severity: 'low' | 'medium' | 'high' | 'extreme';
    radius?: number;            // 影響範圍 (公尺)
    description: string;
    mitigationStatus: 'active' | 'contained' | 'cleared';
    markedAt: Date;
    markedBy: string;
    clearedAt?: Date;
    clearedBy?: string;
}

/**
 * INSARAG 標記服務
 */
@Injectable()
export class InsaragMarkingService {
    private readonly logger = new Logger(InsaragMarkingService.name);
    
    // 建築標記
    private structureMarkings: Map<string, InsaragMarking> = new Map();
    
    // 傷亡標記
    private victimMarkings: Map<string, VictimMarking> = new Map();
    
    // 危害標記
    private hazardMarkings: Map<string, HazardMarking> = new Map();

    constructor(private readonly eventEmitter: EventEmitter2) {}

    // ==================== 建築標記 ====================

    /**
     * 創建建築標記
     */
    createStructureMarking(
        marking: Omit<InsaragMarking, 'id' | 'markedAt' | 'lastUpdated'>,
        markedBy: string,
    ): InsaragMarking {
        const now = new Date();
        const fullMarking: InsaragMarking = {
            ...marking,
            id: `insarag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            markedBy,
            markedAt: now,
            lastUpdated: now,
        };

        this.structureMarkings.set(fullMarking.id, fullMarking);

        this.eventEmitter.emit('insarag.structure.marked', {
            id: fullMarking.id,
            address: fullMarking.structureAddress,
            status: fullMarking.overallStatus,
            victims: fullMarking.quadrant3_victims,
        });

        this.logger.log(`Structure marked: ${fullMarking.structureAddress} (${fullMarking.overallStatus})`);

        return fullMarking;
    }

    /**
     * 更新建築標記
     */
    updateStructureMarking(
        id: string,
        updates: Partial<Omit<InsaragMarking, 'id' | 'markedAt' | 'markedBy'>>,
    ): InsaragMarking | null {
        const marking = this.structureMarkings.get(id);
        if (!marking) return null;

        Object.assign(marking, updates, { lastUpdated: new Date() });

        this.eventEmitter.emit('insarag.structure.updated', {
            id,
            updates,
            newStatus: marking.overallStatus,
        });

        return marking;
    }

    /**
     * 取得建築標記
     */
    getStructureMarking(id: string): InsaragMarking | undefined {
        return this.structureMarkings.get(id);
    }

    /**
     * 依狀態取得建築標記
     */
    getStructuresByStatus(status: StructureStatus): InsaragMarking[] {
        return Array.from(this.structureMarkings.values())
            .filter(m => m.overallStatus === status);
    }

    /**
     * 取得需要搜救的建築
     */
    getStructuresNeedingRescue(): InsaragMarking[] {
        return Array.from(this.structureMarkings.values())
            .filter(m => 
                m.overallStatus === StructureStatus.GO &&
                (m.quadrant3_victims.confirmed.alive > 0 || 
                 (m.quadrant3_victims.estimated?.alive || 0) > 0)
            )
            .sort((a, b) => {
                // 優先確認有存活者
                const aAlive = a.quadrant3_victims.confirmed.alive;
                const bAlive = b.quadrant3_victims.confirmed.alive;
                return bAlive - aAlive;
            });
    }

    // ==================== 傷亡標記 ====================

    /**
     * 新增傷亡標記
     */
    addVictimMarking(
        structureId: string,
        marking: Omit<VictimMarking, 'id' | 'structureId' | 'markedAt'>,
        markedBy: string,
    ): VictimMarking {
        const fullMarking: VictimMarking = {
            ...marking,
            id: `victim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            structureId,
            markedBy,
            markedAt: new Date(),
        };

        this.victimMarkings.set(fullMarking.id, fullMarking);

        // 更新建築標記的傷亡統計
        this.updateStructureVictimCount(structureId);

        this.eventEmitter.emit('insarag.victim.marked', {
            id: fullMarking.id,
            structureId,
            status: fullMarking.status,
            count: fullMarking.count,
        });

        return fullMarking;
    }

    /**
     * 標記已救出
     */
    markVictimRescued(victimId: string, rescuedBy: string): boolean {
        const victim = this.victimMarkings.get(victimId);
        if (!victim) return false;

        victim.status = VictimStatus.EVACUATED;
        victim.rescuedAt = new Date();
        victim.rescuedBy = rescuedBy;

        this.updateStructureVictimCount(victim.structureId);

        this.eventEmitter.emit('insarag.victim.rescued', {
            id: victimId,
            structureId: victim.structureId,
            count: victim.count,
        });

        return true;
    }

    /**
     * 取得建築內的傷亡標記
     */
    getStructureVictims(structureId: string): VictimMarking[] {
        return Array.from(this.victimMarkings.values())
            .filter(v => v.structureId === structureId);
    }

    // ==================== 危害標記 ====================

    /**
     * 新增危害標記
     */
    addHazardMarking(
        marking: Omit<HazardMarking, 'id' | 'markedAt'>,
        markedBy: string,
    ): HazardMarking {
        const fullMarking: HazardMarking = {
            ...marking,
            id: `hazard_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            markedBy,
            markedAt: new Date(),
        };

        this.hazardMarkings.set(fullMarking.id, fullMarking);

        this.eventEmitter.emit('insarag.hazard.marked', {
            id: fullMarking.id,
            type: fullMarking.type,
            severity: fullMarking.severity,
            location: fullMarking.location,
        });

        // 高嚴重度危害發送警報
        if (fullMarking.severity === 'extreme' || fullMarking.severity === 'high') {
            this.eventEmitter.emit('insarag.hazard.alert', fullMarking);
        }

        return fullMarking;
    }

    /**
     * 清除危害
     */
    clearHazard(hazardId: string, clearedBy: string): boolean {
        const hazard = this.hazardMarkings.get(hazardId);
        if (!hazard) return false;

        hazard.mitigationStatus = 'cleared';
        hazard.clearedAt = new Date();
        hazard.clearedBy = clearedBy;

        this.eventEmitter.emit('insarag.hazard.cleared', {
            id: hazardId,
            type: hazard.type,
        });

        return true;
    }

    /**
     * 取得區域內活躍危害
     */
    getActiveHazards(bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    }): HazardMarking[] {
        let hazards = Array.from(this.hazardMarkings.values())
            .filter(h => h.mitigationStatus === 'active');

        if (bounds) {
            hazards = hazards.filter(h =>
                h.location.lat >= bounds.south &&
                h.location.lat <= bounds.north &&
                h.location.lng >= bounds.west &&
                h.location.lng <= bounds.east
            );
        }

        return hazards.sort((a, b) => {
            const severityOrder = { extreme: 4, high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    // ==================== 報表 ====================

    /**
     * 取得搜救統計
     */
    getSearchAndRescueStats(): {
        structures: {
            total: number;
            byStatus: Record<StructureStatus, number>;
        };
        victims: {
            confirmed: { alive: number; deceased: number; evacuated: number };
            estimated: { alive: number; deceased: number };
        };
        hazards: {
            active: number;
            contained: number;
            cleared: number;
            byType: Record<HazardType, number>;
        };
        teams: {
            activeSearches: number;
        };
    } {
        const structures = Array.from(this.structureMarkings.values());
        const victims = Array.from(this.victimMarkings.values());
        const hazards = Array.from(this.hazardMarkings.values());

        // 建築統計
        const structureStats = {
            total: structures.length,
            byStatus: {
                [StructureStatus.GO]: 0,
                [StructureStatus.GO_CAUTION]: 0,
                [StructureStatus.NO_GO]: 0,
                [StructureStatus.ASSESSED]: 0,
            },
        };
        for (const s of structures) {
            structureStats.byStatus[s.overallStatus]++;
        }

        // 傷亡統計
        const victimStats = {
            confirmed: { alive: 0, deceased: 0, evacuated: 0 },
            estimated: { alive: 0, deceased: 0 },
        };
        for (const v of victims) {
            if (v.status === VictimStatus.EVACUATED) {
                victimStats.confirmed.evacuated += v.count;
            } else if (v.status === VictimStatus.ALIVE_HEARD || v.status === VictimStatus.ALIVE_SEEN) {
                victimStats.confirmed.alive += v.count;
            } else if (v.status === VictimStatus.DECEASED) {
                victimStats.confirmed.deceased += v.count;
            }
        }
        for (const s of structures) {
            victimStats.estimated.alive += s.quadrant3_victims.estimated?.alive || 0;
            victimStats.estimated.deceased += s.quadrant3_victims.estimated?.deceased || 0;
        }

        // 危害統計
        const hazardStats = {
            active: 0,
            contained: 0,
            cleared: 0,
            byType: {} as Record<HazardType, number>,
        };
        for (const h of hazards) {
            hazardStats[h.mitigationStatus]++;
            hazardStats.byType[h.type] = (hazardStats.byType[h.type] || 0) + 1;
        }

        // 隊伍統計
        const activeSearches = structures.filter(s =>
            s.quadrant4_teams.some(t => t.status === 'searching')
        ).length;

        return {
            structures: structureStats,
            victims: victimStats,
            hazards: hazardStats,
            teams: { activeSearches },
        };
    }

    /**
     * 產生 INSARAG 報表
     */
    generateInsaragReport(): {
        generatedAt: Date;
        stats: ReturnType<typeof this.getSearchAndRescueStats>;
        activeSearchLocations: Array<{ address: string; teams: string[] }>;
        criticalHazards: HazardMarking[];
        priorityRescues: Array<{ address: string; estimatedAlive: number }>;
    } {
        return {
            generatedAt: new Date(),
            stats: this.getSearchAndRescueStats(),
            activeSearchLocations: this.getStructuresNeedingRescue().map(s => ({
                address: s.structureAddress,
                teams: s.quadrant4_teams.filter(t => t.status === 'searching').map(t => t.teamName),
            })),
            criticalHazards: this.getActiveHazards().filter(h => h.severity === 'extreme'),
            priorityRescues: this.getStructuresNeedingRescue()
                .slice(0, 10)
                .map(s => ({
                    address: s.structureAddress,
                    estimatedAlive: s.quadrant3_victims.confirmed.alive + 
                                   (s.quadrant3_victims.estimated?.alive || 0),
                })),
        };
    }

    // ==================== Private Helpers ====================

    private updateStructureVictimCount(structureId: string): void {
        const structure = this.structureMarkings.get(structureId);
        if (!structure) return;

        const victims = this.getStructureVictims(structureId);
        
        let confirmedAlive = 0;
        let confirmedDeceased = 0;
        
        for (const v of victims) {
            if (v.status === VictimStatus.ALIVE_HEARD || v.status === VictimStatus.ALIVE_SEEN) {
                confirmedAlive += v.count;
            } else if (v.status === VictimStatus.DECEASED) {
                confirmedDeceased += v.count;
            }
        }

        structure.quadrant3_victims.confirmed = {
            alive: confirmedAlive,
            deceased: confirmedDeceased,
        };
        structure.lastUpdated = new Date();
    }
}
