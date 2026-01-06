import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Water Resources Service
 * Integration with Water Resources Agency (WRA) for river levels and flood alerts
 * 
 * 📋 API 來源:
 * - 水利署開放資料平台: https://data.wra.gov.tw/
 */
@Injectable()
export class WaterResourcesService {
    private readonly logger = new Logger(WaterResourcesService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 取得河川水位
     */
    async getRiverLevels(region?: string): Promise<RiverLevel[]> {
        try {
            // 使用水利署開放 API
            const response = await fetch(
                'https://data.wra.gov.tw/Service/OpenData.aspx?format=json&id=E4A73F22-D26C-47E5-B7B0-7F3A84E1F4E4'
            );
            const data = await response.json();

            return (data.RiverLevels || []).map((r: any) => ({
                stationId: r.StationIdentifier,
                stationName: r.StationName,
                riverName: r.RiverName,
                waterLevel: parseFloat(r.WaterLevel),
                warningLevel: parseFloat(r.WarningLevel),
                alertLevel: parseFloat(r.AlertLevel),
                status: this.determineStatus(parseFloat(r.WaterLevel), parseFloat(r.AlertLevel), parseFloat(r.WarningLevel)),
                recordedAt: new Date(r.RecordTime),
            }));
        } catch (error) {
            this.logger.error('Failed to fetch river levels', error);
            return this.getMockRiverLevels();
        }
    }

    /**
     * 取得水庫水情
     */
    async getReservoirStatus(): Promise<ReservoirStatus[]> {
        try {
            const response = await fetch(
                'https://data.wra.gov.tw/Service/OpenData.aspx?format=json&id=1602CA19-B224-4CC3-AA31-11B1B124530F'
            );
            const data = await response.json();

            return (data.ReservoirConditionData || []).map((r: any) => ({
                reservoirId: r.ReservoirIdentifier,
                reservoirName: r.ReservoirName,
                currentCapacity: parseFloat(r.EffectiveWaterStorageCapacity),
                percentage: parseFloat(r.PercentageOfStorage),
                inflow: parseFloat(r.InflowVolume || 0),
                outflow: parseFloat(r.OutflowTotal || 0),
                status: this.getReservoirAlertLevel(parseFloat(r.PercentageOfStorage)),
                recordedAt: new Date(r.RecordTime),
            }));
        } catch (error) {
            this.logger.error('Failed to fetch reservoir status', error);
            return this.getMockReservoirStatus();
        }
    }

    /**
     * 取得淹水潛勢區
     */
    async getFloodPotentialAreas(region: string): Promise<FloodPotentialArea[]> {
        // TODO: 需整合淹水潛勢圖資
        return [
            { areaId: 'fp1', name: '信義區低窪地區', riskLevel: 'high', triggerRainfall: 80, estimatedDepth: 50 },
            { areaId: 'fp2', name: '南港區河岸', riskLevel: 'medium', triggerRainfall: 100, estimatedDepth: 30 },
        ];
    }

    /**
     * 取得水情警報
     */
    getActiveAlerts(): WaterAlert[] {
        return [
            {
                id: 'wa1',
                type: 'river_warning',
                level: 'yellow',
                message: '基隆河水位上升中',
                area: '基隆河流域',
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 6 * 3600000),
            },
        ];
    }

    /**
     * 訂閱水情警報
     */
    subscribeToAlerts(regions: string[], callbackUrl: string): AlertSubscription {
        return {
            subscriptionId: `sub-${Date.now()}`,
            regions,
            callbackUrl,
            status: 'active',
            createdAt: new Date(),
        };
    }

    // Private methods
    private determineStatus(current: number, alert: number, warning: number): string {
        if (current >= alert) return 'alert';
        if (current >= warning) return 'warning';
        return 'normal';
    }

    private getReservoirAlertLevel(percentage: number): string {
        if (percentage < 20) return 'critical';
        if (percentage < 40) return 'warning';
        if (percentage < 60) return 'watch';
        return 'normal';
    }

    private getMockRiverLevels(): RiverLevel[] {
        return [
            { stationId: 'R01', stationName: '南港橋', riverName: '基隆河', waterLevel: 3.5, warningLevel: 5.0, alertLevel: 6.0, status: 'normal', recordedAt: new Date() },
            { stationId: 'R02', stationName: '中正橋', riverName: '新店溪', waterLevel: 4.2, warningLevel: 5.5, alertLevel: 6.5, status: 'normal', recordedAt: new Date() },
        ];
    }

    private getMockReservoirStatus(): ReservoirStatus[] {
        return [
            { reservoirId: 'RV01', reservoirName: '翡翠水庫', currentCapacity: 350000000, percentage: 85, inflow: 50000, outflow: 45000, status: 'normal', recordedAt: new Date() },
            { reservoirId: 'RV02', reservoirName: '石門水庫', currentCapacity: 200000000, percentage: 65, inflow: 30000, outflow: 35000, status: 'watch', recordedAt: new Date() },
        ];
    }
}

// Types
interface RiverLevel { stationId: string; stationName: string; riverName: string; waterLevel: number; warningLevel: number; alertLevel: number; status: string; recordedAt: Date; }
interface ReservoirStatus { reservoirId: string; reservoirName: string; currentCapacity: number; percentage: number; inflow: number; outflow: number; status: string; recordedAt: Date; }
interface FloodPotentialArea { areaId: string; name: string; riskLevel: string; triggerRainfall: number; estimatedDepth: number; }
interface WaterAlert { id: string; type: string; level: string; message: string; area: string; issuedAt: Date; expiresAt: Date; }
interface AlertSubscription { subscriptionId: string; regions: string[]; callbackUrl: string; status: string; createdAt: Date; }
