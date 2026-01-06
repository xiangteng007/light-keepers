import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLocationShare, LocationHistory } from './entities';
import { StartLocationShareDto, UpdateLocationDto } from './dto';

interface AuthUser {
    uid: string;
    displayName?: string;
}

@Injectable()
export class LocationShareService {
    private lastBroadcast = new Map<string, number>();

    constructor(
        @InjectRepository(LiveLocationShare)
        private shareRepo: Repository<LiveLocationShare>,
        @InjectRepository(LocationHistory)
        private historyRepo: Repository<LocationHistory>,
    ) { }

    async start(missionSessionId: string, dto: StartLocationShareDto, user: AuthUser): Promise<LiveLocationShare> {
        let share = await this.shareRepo.findOne({
            where: { userId: user.uid, missionSessionId },
        });

        if (!share) {
            share = this.shareRepo.create({
                userId: user.uid,
                userName: user.displayName || 'Unknown',
                missionSessionId,
            });
        }

        share.mode = dto.mode as any;
        share.isEnabled = true;
        share.startedAt = new Date();
        share.endedAt = null as any;

        if (dto.mode === 'sos') {
            share.ttlExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4h for SOS
        }

        return this.shareRepo.save(share);
    }

    async stop(missionSessionId: string, user: AuthUser): Promise<LiveLocationShare> {
        const share = await this.shareRepo.findOne({
            where: { userId: user.uid, missionSessionId },
        });

        if (!share) throw new Error('No active share found');

        share.isEnabled = false;
        share.mode = 'off' as any;
        share.endedAt = new Date();

        return this.shareRepo.save(share);
    }

    async updateLocation(missionSessionId: string, dto: UpdateLocationDto, user: AuthUser): Promise<boolean> {
        const share = await this.shareRepo.findOne({
            where: { userId: user.uid, missionSessionId, isEnabled: true },
        });

        if (!share) return false;

        // Update last location using query builder
        await this.shareRepo
            .createQueryBuilder()
            .update(LiveLocationShare)
            .set({
                lastGeom: () => `ST_SetSRID(ST_Point(${dto.longitude}, ${dto.latitude}), 4326)`,
                lastAccuracyM: dto.accuracyM,
                lastHeading: dto.heading,
                lastSpeed: dto.speed,
                lastAt: new Date(),
            })
            .where('id = :id', { id: share.id })
            .execute();

        // Throttle: sample to history at intervals
        const now = Date.now();
        const key = `${user.uid}:${missionSessionId}`;
        const lastTime = this.lastBroadcast.get(key) ?? 0;

        if (now - lastTime >= 30000) { // Sample every 30s for history
            await this.historyRepo
                .createQueryBuilder()
                .insert()
                .into(LocationHistory)
                .values({
                    userId: user.uid,
                    missionSessionId,
                    geom: () => `ST_SetSRID(ST_Point(${dto.longitude}, ${dto.latitude}), 4326)`,
                    accuracyM: dto.accuracyM,
                    heading: dto.heading,
                    speed: dto.speed,
                })
                .execute();
            this.lastBroadcast.set(key, now);
        }

        return true;
    }

    async getLiveLocations(missionSessionId: string): Promise<any> {
        const shares = await this.shareRepo.find({
            where: { missionSessionId, isEnabled: true },
        });

        const staleThreshold = new Date(Date.now() - 60 * 1000); // 60s

        return {
            type: 'FeatureCollection',
            features: shares.filter(s => s.lastGeom).map(s => ({
                type: 'Feature',
                geometry: s.lastGeom,
                properties: {
                    userId: s.userId,
                    displayName: s.userName,
                    callsign: s.callsign,
                    accuracyM: s.lastAccuracyM,
                    heading: s.lastHeading,
                    speed: s.lastSpeed,
                    lastAt: s.lastAt?.toISOString(),
                    mode: s.mode,
                    isStale: s.lastAt ? s.lastAt < staleThreshold : true,
                },
            })),
        };
    }
}
