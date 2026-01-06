import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fire 119 API Service
 * Integration with fire department dispatch system
 * 
 * 📋 需要設定:
 * - FIRE119_API_ENDPOINT: 消防署 API 端點
 * - FIRE119_API_KEY: API 金鑰
 */
@Injectable()
export class Fire119Service {
    private readonly logger = new Logger(Fire119Service.name);

    constructor(private configService: ConfigService) { }

    /**
     * 取得最新案件
     */
    async getRecentIncidents(region?: string, hours: number = 24): Promise<Fire119Response> {
        const endpoint = this.configService.get<string>('FIRE119_API_ENDPOINT');
        const apiKey = this.configService.get<string>('FIRE119_API_KEY');

        if (!endpoint || !apiKey) {
            return {
                success: false,
                error: 'FIRE119_NOT_CONFIGURED',
                message: '消防署 119 API 尚未設定',
                requiredEnvVars: ['FIRE119_API_ENDPOINT', 'FIRE119_API_KEY'],
                pendingSpecs: [
                    '需與消防署洽談 API 合作',
                    '取得即時案件推送權限',
                    '確認資料格式與欄位',
                ],
            };
        }

        try {
            const response = await fetch(
                `${endpoint}/incidents?region=${region}&hours=${hours}`,
                { headers: { Authorization: `Bearer ${apiKey}` } }
            );
            const data = await response.json();
            return { success: true, incidents: data.incidents || [] };
        } catch (error) {
            return { success: false, error: 'API_ERROR', message: String(error) };
        }
    }

    /**
     * 訂閱即時案件推送
     */
    async subscribeToIncidents(callbackUrl: string, types: string[]): Promise<SubscriptionResult> {
        // TODO: 待取得 Webhook 規格
        return {
            success: false,
            error: 'NOT_IMPLEMENTED',
            message: 'Webhook 訂閱功能待設定',
            pendingSpecs: [
                'Webhook 格式與認證',
                '推送頻率與批次設定',
                '案件類型篩選規則',
            ],
        };
    }

    /**
     * 取得案件詳情
     */
    async getIncidentDetails(incidentId: string): Promise<IncidentDetails | null> {
        // 模擬資料
        return {
            id: incidentId,
            type: 'fire',
            typeName: '火災',
            reportedAt: new Date(),
            location: { lat: 25.033, lng: 121.565, address: '台北市信義區...' },
            status: 'dispatched',
            severity: 'medium',
            units: [
                { type: 'engine', count: 2 },
                { type: 'ladder', count: 1 },
                { type: 'ambulance', count: 1 },
            ],
            description: '住宅火警，有人受困',
        };
    }

    /**
     * 取得消防車位置
     */
    async getFireUnitLocations(region: string): Promise<FireUnitLocation[]> {
        // TODO: 需 AVL 資料介接
        return [
            { unitId: 'E101', lat: 25.04, lng: 121.55, status: 'available', stationName: '信義分隊' },
            { unitId: 'E102', lat: 25.03, lng: 121.56, status: 'responding', stationName: '中正分隊' },
        ];
    }

    /**
     * 取得案件統計
     */
    async getIncidentStats(region: string, period: string): Promise<IncidentStats> {
        return {
            region,
            period,
            totalIncidents: 156,
            byType: { fire: 45, rescue: 82, ems: 29 },
            avgResponseTime: 6.5, // minutes
            peakHours: [11, 14, 20],
            trend: 'stable',
        };
    }
}

// Types
interface Fire119Response {
    success: boolean; incidents?: FireIncident[];
    error?: string; message?: string;
    requiredEnvVars?: string[]; pendingSpecs?: string[];
}
interface FireIncident {
    id: string; type: string; reportedAt: Date;
    location: { lat: number; lng: number; address: string };
    status: string; severity: string;
}
interface IncidentDetails extends FireIncident {
    typeName: string; units: { type: string; count: number }[]; description: string;
}
interface FireUnitLocation {
    unitId: string; lat: number; lng: number; status: string; stationName: string;
}
interface SubscriptionResult { success: boolean; error?: string; message?: string; pendingSpecs?: string[]; }
interface IncidentStats {
    region: string; period: string; totalIncidents: number;
    byType: Record<string, number>; avgResponseTime: number;
    peakHours: number[]; trend: string;
}
