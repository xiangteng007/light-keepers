/**
 * Drone Fleet Entity - 無人機機隊實體
 * 
 * 記錄無人機設備資訊、狀態、任務歷程、頻譜設定、電池壽命
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

// 無人機狀態枚舉
export enum DroneStatus {
    IDLE = 'idle',              // 閒置
    CHARGING = 'charging',      // 充電中
    PREFLIGHT = 'preflight',    // 起飛前檢查
    IN_FLIGHT = 'in_flight',    // 飛行中
    RETURNING = 'returning',    // 返航中
    MAINTENANCE = 'maintenance', // 維修中
    OFFLINE = 'offline',        // 離線
    EMERGENCY = 'emergency',    // 緊急狀態
}

// 無人機類型枚舉
export enum DroneType {
    RECONNAISSANCE = 'reconnaissance',    // 偵查型
    SUPPLY = 'supply',                    // 運輸型
    COMMUNICATION = 'communication',      // 通訊中繼型
    SEARCH_RESCUE = 'search_rescue',      // 搜救型
    MAPPING = 'mapping',                  // 測繪型
}

@Entity('drone_fleet')
export class DroneFleet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ==================== 基本資訊 ====================

    @Column({ type: 'varchar', length: 100, unique: true })
    serialNumber: string;

    @Column({ type: 'varchar', length: 200 })
    name: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    model: string;  // e.g., "DJI Matrice 300 RTK"

    @Column({ type: 'varchar', length: 100, nullable: true })
    manufacturer: string;

    @Column({
        type: 'enum',
        enum: DroneType,
        default: DroneType.RECONNAISSANCE,
    })
    droneType: DroneType;

    @Column({
        type: 'enum',
        enum: DroneStatus,
        default: DroneStatus.OFFLINE,
    })
    status: DroneStatus;

    // ==================== 位置與飛行 ====================

    @Column({ type: 'jsonb', nullable: true, comment: '當前位置 {lat, lng, altitude}' })
    currentLocation: {
        lat: number;
        lng: number;
        altitude: number;  // 公尺
    };

    @Column({ type: 'jsonb', nullable: true, comment: '母港/基地位置' })
    homeLocation: {
        lat: number;
        lng: number;
        name: string;
    };

    @Column({ type: 'float', nullable: true, comment: '當前速度 (m/s)' })
    currentSpeed: number;

    @Column({ type: 'float', nullable: true, comment: '當前航向 (度)' })
    heading: number;

    @Column({ type: 'float', default: 0, comment: '累計飛行時數 (小時)' })
    totalFlightHours: number;

    @Column({ type: 'int', default: 0, comment: '累計飛行次數' })
    totalFlightCount: number;

    // ==================== 電池 & 能源 ====================

    @Column({ type: 'int', default: 100, comment: '電池電量百分比 (0-100)' })
    batteryLevel: number;

    @Column({ type: 'int', default: 0, comment: '電池充電循環次數' })
    batteryCycles: number;

    @Column({ type: 'int', default: 500, comment: '電池設計壽命 (循環次數)' })
    batteryMaxCycles: number;

    @Column({ type: 'float', nullable: true, comment: '電池健康度 (0-1)' })
    batteryHealth: number;

    @Column({ type: 'timestamp', nullable: true, comment: '上次充電時間' })
    lastChargedAt: Date;

    @Column({ type: 'int', nullable: true, comment: '預估剩餘飛行時間 (分鐘)' })
    estimatedFlightTime: number;

    // ==================== 頻譜 & 通訊 ====================

    @Column({ type: 'jsonb', nullable: true, comment: '頻譜分析設定' })
    spectrumConfig: {
        primaryFrequency: number;    // 主頻率 (MHz)
        backupFrequency: number;     // 備援頻率
        encryptionEnabled: boolean;  // 加密通訊
        antiJammingMode: 'auto' | 'manual' | 'disabled';
        frequencyHopping: boolean;   // 跳頻
        lastScanResult?: {
            timestamp: Date;
            interferenceLevel: number; // 0-1
            interferenceSource?: string;
        };
    };

    @Column({ type: 'varchar', length: 20, nullable: true, comment: '目前使用頻段' })
    currentFrequencyBand: string;  // e.g., "2.4GHz", "5.8GHz", "900MHz"

    @Column({ type: 'int', nullable: true, comment: '訊號強度 (dBm)' })
    signalStrength: number;

    @Column({ type: 'boolean', default: false, comment: '是否作為中繼節點' })
    isMeshRelay: boolean;

    // ==================== 載荷 & 感測器 ====================

    @Column({ type: 'jsonb', nullable: true, comment: '載荷設定' })
    payload: {
        camera?: {
            model: string;
            resolution: string;     // e.g., "4K", "8K"
            hasInfrared: boolean;
            hasZoom: boolean;
            zoomLevel?: number;
        };
        thermalImager?: {
            model: string;
            sensitivity: number;
        };
        lidar?: {
            model: string;
            range: number;          // 公尺
        };
        speaker?: boolean;          // 喊話器
        spotlight?: boolean;        // 探照燈
        supplyDrop?: {
            maxWeight: number;      // 公斤
            currentLoad: number;
        };
    };

    @Column({ type: 'float', nullable: true, comment: '最大載重 (公斤)' })
    maxPayloadWeight: number;

    // ==================== 任務 ====================

    @Column({ type: 'uuid', nullable: true, comment: '當前任務 ID' })
    currentMissionId: string;

    @Column({ type: 'uuid', nullable: true, comment: '分配的操作員 ID' })
    assignedOperatorId: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    assignedOperatorName: string;

    // ==================== 維護 ====================

    @Column({ type: 'timestamp', nullable: true, comment: '上次維護時間' })
    lastMaintenanceAt: Date;

    @Column({ type: 'timestamp', nullable: true, comment: '下次預定維護' })
    nextMaintenanceAt: Date;

    @Column({ type: 'text', nullable: true, comment: '維護備註' })
    maintenanceNotes: string;

    @Column({ type: 'jsonb', nullable: true, comment: '維護歷程' })
    maintenanceHistory: {
        date: Date;
        type: 'routine' | 'repair' | 'upgrade';
        description: string;
        technician: string;
    }[];

    // ==================== AI 偵測 ====================

    @Column({ type: 'boolean', default: true, comment: '是否啟用 AI 自動偵測' })
    aiDetectionEnabled: boolean;

    @Column({ type: 'jsonb', nullable: true, comment: 'AI 偵測設定' })
    aiConfig: {
        victimDetection: boolean;     // 受困者偵測
        fireDetection: boolean;       // 火災偵測
        floodDetection: boolean;      // 水災偵測
        structuralDamage: boolean;    // 結構損壞
        vehicleTracking: boolean;     // 車輛追蹤
        confidenceThreshold: number;  // 信心閾值 (0-1)
    };

    // ==================== 時間戳記 ====================

    @Column({ type: 'timestamp', nullable: true, comment: '上次心跳時間' })
    lastHeartbeat: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // ==================== 計算屬性 ====================

    /**
     * 電池壽命百分比
     */
    get batteryLifePercent(): number {
        return Math.max(0, 100 - (this.batteryCycles / this.batteryMaxCycles) * 100);
    }

    /**
     * 是否需要維護
     */
    get needsMaintenance(): boolean {
        if (!this.nextMaintenanceAt) return false;
        return new Date() >= this.nextMaintenanceAt;
    }

    /**
     * 是否可用於任務
     */
    get isAvailable(): boolean {
        return (
            this.status === DroneStatus.IDLE &&
            this.batteryLevel > 30 &&
            !this.needsMaintenance
        );
    }
}
