/**
 * Water Resources Agency (WRA) Provider
 * 
 * Integration with Taiwan's WRA Open Data API
 * https://data.moenv.gov.tw/
 * 
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WaterLevelStation {
    stationId: string;
    stationName: string;
    riverName: string;
    basinName: string;
    city: string;
    township: string;
    latitude: number;
    longitude: number;
    currentLevel: number;
    warningLevel: number;
    alertLevel: number;
    floodLevel: number;
    observeTime: Date;
    status: 'normal' | 'warning' | 'alert' | 'flood';
    trend: 'rising' | 'falling' | 'stable';
}

export interface FloodPotential {
    areaCode: string;
    areaName: string;
    city: string;
    township: string;
    level: 0 | 1 | 2 | 3; // 0: low, 1: moderate, 2: high, 3: very high
    description: string;
    lastUpdated: Date;
}

export interface ReservoirStatus {
    reservoirId: string;
    reservoirName: string;
    capacity: number;        // 有效蓄水 (萬立方公尺)
    currentStorage: number;  // 目前蓄水量
    percentage: number;      // 蓄水百分比
    inflow: number;          // 入流量 (CMS)
    outflow: number;         // 出流量 (CMS)
    waterLevel: number;      // 水位 (公尺)
    observeTime: Date;
    status: 'normal' | 'low' | 'critical';
}

@Injectable()
export class WraProvider implements OnModuleInit {
    private readonly logger = new Logger(WraProvider.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://data.moenv.gov.tw/api/v2';

    private cachedStations: WaterLevelStation[] = [];
    private cachedReservoirs: ReservoirStatus[] = [];
    private lastFetchTime: Date | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.apiKey = this.configService.get<string>('WRA_API_KEY', '');
    }

    onModuleInit() {
        if (!this.apiKey) {
            this.logger.warn('WRA_API_KEY not configured, using mock data');
        } else {
            this.logger.log('WRA Provider initialized');
        }
    }

    /**
     * Get water level stations
     */
    async getWaterLevelStations(city?: string): Promise<WaterLevelStation[]> {
        // 使用 Mock 資料 (實際 API 需申請權限)
        const stations = this.getMockWaterLevelStations();

        if (city) {
            return stations.filter(s => s.city === city);
        }
        return stations;
    }

    /**
     * Get stations with warning or higher status
     */
    async getWarningStations(): Promise<WaterLevelStation[]> {
        const stations = await this.getWaterLevelStations();
        return stations.filter(s => s.status !== 'normal');
    }

    /**
     * Get flood potential areas
     */
    async getFloodPotential(city?: string): Promise<FloodPotential[]> {
        const areas = this.getMockFloodPotential();

        if (city) {
            return areas.filter(a => a.city === city);
        }
        return areas;
    }

    /**
     * Get reservoir status
     */
    async getReservoirStatus(): Promise<ReservoirStatus[]> {
        return this.getMockReservoirStatus();
    }

    /**
     * Check if any water level exceeds threshold
     */
    async checkWaterLevelAlerts(): Promise<WaterLevelStation[]> {
        const stations = await this.getWaterLevelStations();
        const alertStations = stations.filter(s =>
            s.status === 'alert' || s.status === 'flood'
        );

        alertStations.forEach(station => {
            this.eventEmitter.emit('water.alert', {
                stationId: station.stationId,
                stationName: station.stationName,
                riverName: station.riverName,
                city: station.city,
                level: station.currentLevel,
                status: station.status,
                timestamp: new Date(),
            });
        });

        return alertStations;
    }

    // ===== Mock Data =====

    private getMockWaterLevelStations(): WaterLevelStation[] {
        return [
            {
                stationId: 'WL-001',
                stationName: '景美溪橋水位站',
                riverName: '景美溪',
                basinName: '新店溪流域',
                city: '臺北市',
                township: '文山區',
                latitude: 24.9918,
                longitude: 121.5534,
                currentLevel: 3.2,
                warningLevel: 4.5,
                alertLevel: 5.5,
                floodLevel: 6.5,
                observeTime: new Date(),
                status: 'normal',
                trend: 'stable',
            },
            {
                stationId: 'WL-002',
                stationName: '基隆河南港水位站',
                riverName: '基隆河',
                basinName: '基隆河流域',
                city: '臺北市',
                township: '南港區',
                latitude: 25.0530,
                longitude: 121.6166,
                currentLevel: 4.8,
                warningLevel: 4.5,
                alertLevel: 5.5,
                floodLevel: 6.5,
                observeTime: new Date(),
                status: 'warning',
                trend: 'rising',
            },
            {
                stationId: 'WL-003',
                stationName: '大漢溪三峽水位站',
                riverName: '大漢溪',
                basinName: '大漢溪流域',
                city: '新北市',
                township: '三峽區',
                latitude: 24.9340,
                longitude: 121.3693,
                currentLevel: 2.1,
                warningLevel: 5.0,
                alertLevel: 6.0,
                floodLevel: 7.0,
                observeTime: new Date(),
                status: 'normal',
                trend: 'falling',
            },
            {
                stationId: 'WL-004',
                stationName: '高屏溪里港水位站',
                riverName: '高屏溪',
                basinName: '高屏溪流域',
                city: '高雄市',
                township: '里港區',
                latitude: 22.7856,
                longitude: 120.5024,
                currentLevel: 5.8,
                warningLevel: 4.0,
                alertLevel: 5.5,
                floodLevel: 6.5,
                observeTime: new Date(),
                status: 'alert',
                trend: 'rising',
            },
        ];
    }

    private getMockFloodPotential(): FloodPotential[] {
        return [
            {
                areaCode: 'FP-001',
                areaName: '南港低窪區',
                city: '臺北市',
                township: '南港區',
                level: 2,
                description: '歷史上曾因基隆河暴漲導致淹水',
                lastUpdated: new Date(),
            },
            {
                areaCode: 'FP-002',
                areaName: '汐止中正路周邊',
                city: '新北市',
                township: '汐止區',
                level: 2,
                description: '排水系統易因大雨不及宣洩',
                lastUpdated: new Date(),
            },
            {
                areaCode: 'FP-003',
                areaName: '岡山低窪區',
                city: '高雄市',
                township: '岡山區',
                level: 1,
                description: '地勢低窪，需注意積水',
                lastUpdated: new Date(),
            },
        ];
    }

    private getMockReservoirStatus(): ReservoirStatus[] {
        return [
            {
                reservoirId: 'RV-001',
                reservoirName: '石門水庫',
                capacity: 20916,
                currentStorage: 15687,
                percentage: 75.0,
                inflow: 45.2,
                outflow: 42.8,
                waterLevel: 243.5,
                observeTime: new Date(),
                status: 'normal',
            },
            {
                reservoirId: 'RV-002',
                reservoirName: '曾文水庫',
                capacity: 47908,
                currentStorage: 28744,
                percentage: 60.0,
                inflow: 32.1,
                outflow: 35.6,
                waterLevel: 218.3,
                observeTime: new Date(),
                status: 'normal',
            },
            {
                reservoirId: 'RV-003',
                reservoirName: '翡翠水庫',
                capacity: 33500,
                currentStorage: 30150,
                percentage: 90.0,
                inflow: 28.5,
                outflow: 25.0,
                waterLevel: 165.2,
                observeTime: new Date(),
                status: 'normal',
            },
            {
                reservoirId: 'RV-004',
                reservoirName: '南化水庫',
                capacity: 9147,
                currentStorage: 3659,
                percentage: 40.0,
                inflow: 8.2,
                outflow: 12.5,
                waterLevel: 152.8,
                observeTime: new Date(),
                status: 'low',
            },
        ];
    }

    // ===== Scheduled Tasks =====

    @Cron(CronExpression.EVERY_30_MINUTES)
    async refreshData(): Promise<void> {
        if (!this.apiKey) return;

        this.logger.log('Refreshing WRA data...');
        await this.checkWaterLevelAlerts();
    }
}
