import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Citizen App Service
 * Backend API for independent citizen disaster reporting app
 * 
 * 📋 設計說明:
 * - 獨立的簡化 API 供公民 App 使用
 * - 不需要完整志工認證
 * - 支援匿名回報
 * - 輕量化回應格式
 */
@Injectable()
export class CitizenAppService {
    private readonly logger = new Logger(CitizenAppService.name);

    private reports: Map<string, CitizenReport> = new Map();
    private anonymousTokens: Map<string, AnonymousSession> = new Map();

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    // ==========================================
    // 匿名認證
    // ==========================================

    /**
     * 建立匿名工作階段
     * 不需要註冊即可回報
     */
    createAnonymousSession(deviceId: string): AnonymousSession {
        const session: AnonymousSession = {
            token: `anon-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
            deviceId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            reportCount: 0,
            reputationScore: 50,
        };

        this.anonymousTokens.set(session.token, session);
        return session;
    }

    /**
     * 驗證匿名 Token
     */
    validateSession(token: string): AnonymousSession | null {
        const session = this.anonymousTokens.get(token);
        if (!session) return null;
        if (new Date() > session.expiresAt) return null;
        return session;
    }

    // ==========================================
    // 災情回報 (簡化版)
    // ==========================================

    /**
     * 提交災情回報
     * 簡化流程，快速回報
     */
    async submitReport(token: string, data: CitizenReportInput): Promise<CitizenReport> {
        const session = this.validateSession(token);

        const report: CitizenReport = {
            id: `cit-${Date.now()}`,
            sessionToken: token,
            isAnonymous: !session, // 允許完全匿名
            type: data.type,
            description: data.description,
            location: data.location,
            photos: data.photos || [],
            severity: data.severity || 'unknown',
            status: 'submitted',
            verificationStatus: 'pending',
            submittedAt: new Date(),
        };

        this.reports.set(report.id, report);

        // 更新信譽分數
        if (session) {
            session.reportCount++;
        }

        // 觸發事件供其他模組處理
        this.eventEmitter.emit('citizen.report.submitted', report);

        return report;
    }

    /**
     * 取得回報狀態
     */
    getReportStatus(reportId: string): ReportStatusResponse | null {
        const report = this.reports.get(reportId);
        if (!report) return null;

        return {
            id: report.id,
            status: report.status,
            verificationStatus: report.verificationStatus,
            submittedAt: report.submittedAt,
            lastUpdated: report.lastUpdated || report.submittedAt,
            message: this.getStatusMessage(report.status),
        };
    }

    // ==========================================
    // 即時資訊 (公開)
    // ==========================================

    /**
     * 取得附近警報
     */
    getNearbyAlerts(lat: number, lng: number, radiusKm: number = 50): PublicAlert[] {
        // 會從 NCDR 模組取得資料
        // 這裡回傳簡化格式供 App 顯示
        return [
            // 範例資料
            {
                id: 'alert-1',
                type: 'earthquake',
                title: '地震速報',
                severity: 'orange',
                distance: 15,
                issuedAt: new Date(),
            },
        ];
    }

    /**
     * 取得附近避難所
     */
    getNearbyShelters(lat: number, lng: number, limit: number = 10): PublicShelter[] {
        // 會從避難所模組取得資料
        return [
            // 範例資料
            {
                id: 'shelter-1',
                name: '中正國小',
                address: '台北市中正區...',
                distance: 500,
                capacity: 200,
                available: 150,
                lat: lat + 0.001,
                lng: lng + 0.001,
                hasWater: true,
                hasFood: true,
                hasMedical: false,
            },
        ];
    }

    /**
     * 取得最新公告
     */
    getPublicAnnouncements(): PublicAnnouncement[] {
        return [
            {
                id: 'ann-1',
                title: '防災準備提醒',
                content: '請備妥三日份緊急物資',
                priority: 'normal',
                publishedAt: new Date(),
            },
        ];
    }

    // ==========================================
    // App 版本控制
    // ==========================================

    /**
     * 檢查 App 版本
     */
    checkAppVersion(currentVersion: string, platform: 'ios' | 'android'): VersionCheckResult {
        const minVersions = {
            ios: '1.0.0',
            android: '1.0.0',
        };
        const latestVersions = {
            ios: '1.2.0',
            android: '1.2.0',
        };

        const current = this.parseVersion(currentVersion);
        const min = this.parseVersion(minVersions[platform]);
        const latest = this.parseVersion(latestVersions[platform]);

        return {
            currentVersion,
            latestVersion: latestVersions[platform],
            updateRequired: current < min,
            updateAvailable: current < latest,
            storeUrl: platform === 'ios'
                ? 'https://apps.apple.com/app/light-keepers/id123456789'  // TODO: 實際 App Store ID
                : 'https://play.google.com/store/apps/details?id=org.lightkeepers.citizen',  // TODO: 實際 Package Name
        };
    }

    // ==========================================
    // 離線支援
    // ==========================================

    /**
     * 取得離線資料包
     * App 可下載後離線使用
     */
    getOfflineDataPackage(region: string): OfflinePackage {
        return {
            version: '2026-01-07',
            region,
            shelters: [], // 避難所清單
            emergencyContacts: [
                { name: '警消', number: '119', type: 'emergency' },
                { name: '報案', number: '110', type: 'emergency' },
                { name: '婦幼保護', number: '113', type: 'support' },
                { name: '生命線', number: '1925', type: 'support' },
            ],
            offlineMapTiles: `https://tiles.lightkeepers.org/${region}/offline.mbtiles`,  // TODO: 實際圖磚 URL
            lastUpdated: new Date(),
        };
    }

    // ==========================================
    // 工具方法
    // ==========================================

    private getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            submitted: '回報已收到，等待審核',
            verified: '已驗證，感謝您的回報',
            processing: '相關單位處理中',
            resolved: '已處理完成',
            rejected: '經查無法確認，感謝回報',
        };
        return messages[status] || '處理中';
    }

    private parseVersion(version: string): number {
        const parts = version.split('.').map(Number);
        return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
    }
}

// ==========================================
// 類型定義
// ==========================================
interface AnonymousSession {
    token: string;
    deviceId: string;
    createdAt: Date;
    expiresAt: Date;
    reportCount: number;
    reputationScore: number;
}

interface CitizenReportInput {
    type: 'fire' | 'flood' | 'earthquake' | 'landslide' | 'traffic' | 'other';
    description: string;
    location: { lat: number; lng: number; address?: string };
    photos?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
}

interface CitizenReport extends CitizenReportInput {
    id: string;
    sessionToken: string | null;
    isAnonymous: boolean;
    status: 'submitted' | 'verified' | 'processing' | 'resolved' | 'rejected';
    verificationStatus: 'pending' | 'verified' | 'rejected';
    submittedAt: Date;
    lastUpdated?: Date;
}

interface ReportStatusResponse {
    id: string;
    status: string;
    verificationStatus: string;
    submittedAt: Date;
    lastUpdated: Date;
    message: string;
}

interface PublicAlert {
    id: string;
    type: string;
    title: string;
    severity: string;
    distance: number;
    issuedAt: Date;
}

interface PublicShelter {
    id: string;
    name: string;
    address: string;
    distance: number;
    capacity: number;
    available: number;
    lat: number;
    lng: number;
    hasWater: boolean;
    hasFood: boolean;
    hasMedical: boolean;
}

interface PublicAnnouncement {
    id: string;
    title: string;
    content: string;
    priority: 'urgent' | 'high' | 'normal';
    publishedAt: Date;
}

interface VersionCheckResult {
    currentVersion: string;
    latestVersion: string;
    updateRequired: boolean;
    updateAvailable: boolean;
    storeUrl: string;
}

interface OfflinePackage {
    version: string;
    region: string;
    shelters: any[];
    emergencyContacts: { name: string; number: string; type: string }[];
    offlineMapTiles: string;
    lastUpdated: Date;
}
