import { Injectable, Logger } from '@nestjs/common';

export interface ApiVersion {
    version: string;
    status: 'current' | 'deprecated' | 'sunset';
    releaseDate: Date;
    sunsetDate?: Date;
    changelog: string[];
    breaking: boolean;
}

export interface DeprecationWarning {
    path: string;
    version: string;
    message: string;
    sunsetDate: Date;
    replacement?: string;
}

/**
 * API Versioning Service
 * 
 * 管理 API 版本：
 * - 版本追蹤
 * - 棄用警告
 * - 版本協商
 */
@Injectable()
export class ApiVersioningService {
    private readonly logger = new Logger(ApiVersioningService.name);

    private versions: Map<string, ApiVersion> = new Map([
        ['v1', {
            version: 'v1',
            status: 'deprecated',
            releaseDate: new Date('2024-01-01'),
            sunsetDate: new Date('2026-06-01'),
            changelog: ['Initial release'],
            breaking: false,
        }],
        ['v2', {
            version: 'v2',
            status: 'current',
            releaseDate: new Date('2025-06-01'),
            changelog: [
                'Added ICS form support',
                'Added HXL export',
                'Added OCHA 3W integration',
                'Added Sphere compliance checking',
            ],
            breaking: true,
        }],
    ]);

    private deprecations: DeprecationWarning[] = [
        {
            path: '/api/v1/weather',
            version: 'v1',
            message: 'v1 weather API is deprecated, use /api/v2/weather',
            sunsetDate: new Date('2026-06-01'),
            replacement: '/api/v2/weather',
        },
        {
            path: '/api/v1/reports',
            version: 'v1',
            message: 'v1 reports API is deprecated, use /api/v2/reports',
            sunsetDate: new Date('2026-06-01'),
            replacement: '/api/v2/reports',
        },
    ];

    /**
     * 取得當前版本
     */
    getCurrentVersion(): string {
        for (const [version, info] of this.versions) {
            if (info.status === 'current') return version;
        }
        return 'v2';
    }

    /**
     * 取得所有版本
     */
    getAllVersions(): ApiVersion[] {
        return Array.from(this.versions.values());
    }

    /**
     * 取得版本資訊
     */
    getVersion(version: string): ApiVersion | undefined {
        return this.versions.get(version);
    }

    /**
     * 檢查版本是否支援
     */
    isVersionSupported(version: string): boolean {
        const v = this.versions.get(version);
        return v ? v.status !== 'sunset' : false;
    }

    /**
     * 取得棄用警告
     */
    getDeprecationWarning(path: string): DeprecationWarning | undefined {
        return this.deprecations.find(d => path.startsWith(d.path));
    }

    /**
     * 取得所有棄用警告
     */
    getAllDeprecations(): DeprecationWarning[] {
        return this.deprecations;
    }

    /**
     * 協商版本
     */
    negotiateVersion(requestedVersion: string, acceptHeader?: string): {
        version: string;
        warning?: string;
    } {
        // 如果請求特定版本
        if (requestedVersion) {
            const v = this.versions.get(requestedVersion);
            if (!v) {
                return { version: this.getCurrentVersion(), warning: `Unknown version: ${requestedVersion}` };
            }
            if (v.status === 'sunset') {
                return { version: this.getCurrentVersion(), warning: `Version ${requestedVersion} is sunset` };
            }
            if (v.status === 'deprecated') {
                return { 
                    version: requestedVersion, 
                    warning: `Version ${requestedVersion} is deprecated, sunset date: ${v.sunsetDate?.toISOString()}` 
                };
            }
            return { version: requestedVersion };
        }

        // 解析 Accept header
        if (acceptHeader) {
            const match = acceptHeader.match(/application\/vnd\.lightkeepers\.v(\d+)\+json/);
            if (match) {
                return this.negotiateVersion(`v${match[1]}`);
            }
        }

        return { version: this.getCurrentVersion() };
    }

    /**
     * 新增版本
     */
    addVersion(version: ApiVersion): void {
        this.versions.set(version.version, version);
    }

    /**
     * 棄用版本
     */
    deprecateVersion(version: string, sunsetDate: Date): boolean {
        const v = this.versions.get(version);
        if (!v) return false;

        v.status = 'deprecated';
        v.sunsetDate = sunsetDate;
        
        this.logger.warn(`Version ${version} deprecated, sunset: ${sunsetDate.toISOString()}`);
        return true;
    }
}
