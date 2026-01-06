import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapPackage } from './entities/map-package.entity';
import {
    MapPackageDto,
    PackageRecommendationDto,
    PackageManifestDto,
} from './dto';

@Injectable()
export class MapPackagesService {
    private readonly logger = new Logger(MapPackagesService.name);

    constructor(
        @InjectRepository(MapPackage)
        private readonly packageRepo: Repository<MapPackage>,
    ) { }

    /**
     * List all available packages
     */
    async list(type?: string): Promise<MapPackageDto[]> {
        const where: any = { isActive: true };
        if (type) {
            where.type = type;
        }

        const packages = await this.packageRepo.find({
            where,
            order: { publishedAt: 'DESC' },
        });

        return packages.map(p => this.toDto(p));
    }

    /**
     * Get package recommendations for a session
     */
    async getRecommendations(sessionId?: string): Promise<PackageRecommendationDto[]> {
        const recommendations: PackageRecommendationDto[] = [];

        // Always recommend Taiwan basemap
        const basemap = await this.packageRepo.findOne({
            where: { type: 'basemap', region: 'taiwan', isActive: true },
            order: { publishedAt: 'DESC' },
        });

        if (basemap) {
            recommendations.push({
                package: this.toDto(basemap),
                reason: '台灣全境基礎底圖',
                priority: 1,
            });
        }

        // If session provided, look for AOI-specific package
        if (sessionId) {
            const aoiPackage = await this.packageRepo.findOne({
                where: { type: 'aoi', region: `aoi:${sessionId}`, isActive: true },
                order: { publishedAt: 'DESC' },
            });

            if (aoiPackage) {
                recommendations.push({
                    package: this.toDto(aoiPackage),
                    reason: '任務區域高細節圖磚',
                    priority: 1,
                });
            }
        }

        // Optional terrain packages
        const terrainTypes = ['terrain', 'contours'];
        for (const terrainType of terrainTypes) {
            const terrain = await this.packageRepo.findOne({
                where: { type: terrainType, region: 'taiwan', isActive: true },
                order: { publishedAt: 'DESC' },
            });

            if (terrain) {
                recommendations.push({
                    package: this.toDto(terrain),
                    reason: terrainType === 'terrain' ? '地形陰影圖層' : '等高線圖層',
                    priority: 3,
                });
            }
        }

        return recommendations;
    }

    /**
     * Get package manifest for download
     */
    async getManifest(id: string): Promise<PackageManifestDto | null> {
        const pkg = await this.packageRepo.findOne({ where: { id } });
        if (!pkg) {
            return null;
        }

        const metadata = pkg.metadata || {};
        return {
            id: pkg.id,
            name: pkg.name,
            version: pkg.version,
            fileUrl: pkg.fileUrl,
            fileSize: pkg.fileSize,
            sha256: pkg.sha256,
            bounds: metadata.bounds || [120.0, 21.5, 122.5, 26.0], // Default Taiwan bounds
            minZoom: metadata.minZoom || 0,
            maxZoom: metadata.maxZoom || 14,
            format: metadata.format || 'mvt',
        };
    }

    /**
     * Helper: Map entity to DTO
     */
    private toDto(pkg: MapPackage): MapPackageDto {
        return {
            id: pkg.id,
            name: pkg.name,
            type: pkg.type,
            region: pkg.region,
            fileUrl: pkg.fileUrl,
            fileSize: pkg.fileSize,
            sha256: pkg.sha256,
            version: pkg.version,
            publishedAt: pkg.publishedAt,
            metadata: pkg.metadata,
        };
    }
}
