import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Power BI Integration Service
 * Embed Power BI dashboards and real-time disaster visualization
 * 
 * 📋 需要設定:
 * - POWERBI_CLIENT_ID: Azure AD App Client ID
 * - POWERBI_CLIENT_SECRET: Azure AD App Secret
 * - POWERBI_TENANT_ID: Azure AD Tenant ID
 * - POWERBI_WORKSPACE_ID: Power BI Workspace ID
 */
@Injectable()
export class PowerBiService {
    private readonly logger = new Logger(PowerBiService.name);
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(private configService: ConfigService) { }

    /**
     * 取得嵌入設定
     */
    async getEmbedConfig(reportId: string): Promise<EmbedConfig> {
        const token = await this.getAccessToken();

        if (!token) {
            return {
                success: false,
                error: 'POWERBI_NOT_CONFIGURED',
                message: 'Power BI 尚未設定，請設定 Azure AD 應用程式',
                requiredEnvVars: [
                    'POWERBI_CLIENT_ID',
                    'POWERBI_CLIENT_SECRET',
                    'POWERBI_TENANT_ID',
                    'POWERBI_WORKSPACE_ID',
                ],
            };
        }

        const workspaceId = this.configService.get<string>('POWERBI_WORKSPACE_ID');

        try {
            // 取得報表資訊
            const reportResponse = await fetch(
                `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const report = await reportResponse.json();

            // 產生嵌入 Token
            const embedTokenResponse = await fetch(
                `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ accessLevel: 'View' }),
                }
            );
            const embedToken = await embedTokenResponse.json();

            return {
                success: true,
                reportId,
                embedUrl: report.embedUrl,
                accessToken: embedToken.token,
                expiry: embedToken.expiration,
            };
        } catch (error) {
            this.logger.error('Failed to get embed config', error);
            return { success: false, error: 'API_ERROR', message: String(error) };
        }
    }

    /**
     * 取得可用報表清單
     */
    async listReports(): Promise<PowerBiReport[]> {
        const token = await this.getAccessToken();
        if (!token) return [];

        const workspaceId = this.configService.get<string>('POWERBI_WORKSPACE_ID');

        try {
            const response = await fetch(
                `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json();
            return data.value || [];
        } catch (error) {
            this.logger.error('Failed to list reports', error);
            return [];
        }
    }

    /**
     * 取得預設儀表板配置
     */
    getDefaultDashboards(): DashboardConfig[] {
        return [
            {
                id: 'realtime-disaster',
                name: '即時災情儀表板',
                description: '即時顯示災情分布、志工位置、資源狀態',
                reportId: 'TODO: 建立後填入',
            },
            {
                id: 'volunteer-stats',
                name: '志工統計',
                description: '出勤率、完成任務數、區域分布',
                reportId: 'TODO: 建立後填入',
            },
            {
                id: 'resource-overview',
                name: '物資總覽',
                description: '庫存狀態、消耗趨勢、預警提醒',
                reportId: 'TODO: 建立後填入',
            },
            {
                id: 'incident-analysis',
                name: '事件分析',
                description: '歷史案件統計、類型分析、時間分布',
                reportId: 'TODO: 建立後填入',
            },
        ];
    }

    /**
     * 推送資料到 Power BI 串流資料集
     */
    async pushToStreamingDataset(datasetId: string, rows: any[]): Promise<boolean> {
        const token = await this.getAccessToken();
        if (!token) return false;

        const workspaceId = this.configService.get<string>('POWERBI_WORKSPACE_ID');

        try {
            const response = await fetch(
                `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/rows`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ rows }),
                }
            );
            return response.ok;
        } catch (error) {
            this.logger.error('Failed to push data', error);
            return false;
        }
    }

    // Private methods
    private async getAccessToken(): Promise<string | null> {
        const clientId = this.configService.get<string>('POWERBI_CLIENT_ID');
        const clientSecret = this.configService.get<string>('POWERBI_CLIENT_SECRET');
        const tenantId = this.configService.get<string>('POWERBI_TENANT_ID');

        if (!clientId || !clientSecret || !tenantId) {
            return null;
        }

        // 檢查快取的 Token 是否還有效
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await fetch(
                `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: clientId,
                        client_secret: clientSecret,
                        scope: 'https://analysis.windows.net/powerbi/api/.default',
                    }),
                }
            );

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);

            return this.accessToken;
        } catch (error) {
            this.logger.error('Failed to get access token', error);
            return null;
        }
    }
}

// Types
interface EmbedConfig {
    success: boolean;
    reportId?: string;
    embedUrl?: string;
    accessToken?: string;
    expiry?: string;
    error?: string;
    message?: string;
    requiredEnvVars?: string[];
}

interface PowerBiReport {
    id: string;
    name: string;
    webUrl: string;
    embedUrl: string;
}

interface DashboardConfig {
    id: string;
    name: string;
    description: string;
    reportId: string;
}
