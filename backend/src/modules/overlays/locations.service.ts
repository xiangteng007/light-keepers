import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, ILike } from 'typeorm';
import { Location } from './entities/location.entity';
import { LocationAlias } from './entities/location-alias.entity';
import {
    LocationDto,
    SearchLocationsDto,
    GetLocationChangesDto,
    ImportLocationsDto,
} from './dto';

@Injectable()
export class LocationsService {
    private readonly logger = new Logger(LocationsService.name);

    constructor(
        @InjectRepository(Location)
        private readonly locationRepo: Repository<Location>,
        @InjectRepository(LocationAlias)
        private readonly aliasRepo: Repository<LocationAlias>,
    ) { }

    /**
     * Search locations with optional bbox filtering
     */
    async search(query: SearchLocationsDto): Promise<LocationDto[]> {
        const qb = this.locationRepo.createQueryBuilder('l')
            .leftJoinAndSelect('l.aliases', 'a')
            .where('l.isActive = true');

        // Text search on name
        if (query.q) {
            qb.andWhere(
                '(l.name ILIKE :q OR l.address ILIKE :q OR a.alias ILIKE :q)',
                { q: `%${query.q}%` },
            );
        }

        // Category filter
        if (query.category) {
            qb.andWhere('l.category = :category', { category: query.category });
        }

        // Bounding box filter (minLng,minLat,maxLng,maxLat)
        if (query.bbox) {
            const [minLng, minLat, maxLng, maxLat] = query.bbox.split(',').map(Number);
            qb.andWhere(
                `(l.geometry->'coordinates'->>0)::float BETWEEN :minLng AND :maxLng`,
                { minLng, maxLng },
            );
            qb.andWhere(
                `(l.geometry->'coordinates'->>1)::float BETWEEN :minLat AND :maxLat`,
                { minLat, maxLat },
            );
        }

        qb.orderBy('l.name', 'ASC')
            .limit(query.limit || 20);

        const locations = await qb.getMany();
        return locations.map(l => this.toDto(l));
    }

    /**
     * Get location changes since a given timestamp
     */
    async getChanges(query: GetLocationChangesDto): Promise<LocationDto[]> {
        const since = new Date(query.since);
        const locations = await this.locationRepo.find({
            where: {
                updatedAt: MoreThan(since),
            },
            relations: ['aliases'],
            order: { updatedAt: 'DESC' },
        });

        return locations.map(l => this.toDto(l));
    }

    /**
     * Import locations from external source (stub for v1)
     */
    async import(dto: ImportLocationsDto): Promise<{ count: number }> {
        this.logger.log(`Import request from source: ${dto.source}, count: ${dto.locations.length}`);

        let imported = 0;

        for (const loc of dto.locations) {
            // Check for existing by source + sourceId
            let existing: Location | null = null;
            if (dto.upsert !== false && loc.sourceId) {
                existing = await this.locationRepo.findOne({
                    where: { source: dto.source, sourceId: loc.sourceId },
                });
            }

            const entity = existing || this.locationRepo.create({
                source: dto.source,
                sourceId: loc.sourceId,
            });

            entity.name = loc.name;
            entity.category = loc.category;
            entity.geometry = {
                type: 'Point',
                coordinates: [loc.longitude, loc.latitude],
            };
            entity.address = loc.address ?? undefined;
            entity.city = loc.city ?? undefined;
            entity.district = loc.district ?? undefined;
            entity.props = loc.props || {};
            entity.version = (entity.version || 0) + 1;

            const saved = await this.locationRepo.save(entity);

            // Handle aliases
            if (loc.aliases && loc.aliases.length > 0) {
                // Remove existing aliases
                await this.aliasRepo.delete({ locationId: saved.id });

                // Add new aliases
                for (const alias of loc.aliases) {
                    const aliasEntity = this.aliasRepo.create({
                        locationId: saved.id,
                        alias,
                        language: 'zh-TW',
                    });
                    await this.aliasRepo.save(aliasEntity);
                }
            }

            imported++;
        }

        this.logger.log(`Imported ${imported} locations from ${dto.source}`);
        return { count: imported };
    }

    /**
     * Helper: Map entity to DTO
     */
    private toDto(location: Location): LocationDto {
        return {
            id: location.id,
            source: location.source,
            sourceId: location.sourceId,
            name: location.name,
            category: location.category,
            geometry: location.geometry,
            address: location.address,
            city: location.city,
            district: location.district,
            props: location.props,
            version: location.version,
            updatedAt: location.updatedAt,
            aliases: location.aliases?.map(a => a.alias),
        };
    }
}
