/**
 * 地圖派遣服務 (Map Dispatch Service)
 * COP 地圖即操作：框選派遣、責任區指派、ETA 計算
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sector, SectorStatus } from './entities/sector.entity';
import { RallyPoint, RallyPointStatus } from './entities/rally-point.entity';
import { PlannedRoute, RouteStatus } from './entities/planned-route.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { DecisionLog, DecisionType } from '../mission-sessions/entities/decision-log.entity';

interface BboxDispatchDto {
    missionSessionId: string;
    bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    teamId: string;
    teamName: string;
    taskTitle: string;
    taskDescription?: string;
    priority?: number;
    createdBy: string;
}

interface SectorAssignDto {
    teamId: string;
    teamName: string;
    assignedBy: string;
}

@Injectable()
export class MapDispatchService {
    constructor(
        @InjectRepository(Sector)
        private sectorRepo: Repository<Sector>,
        @InjectRepository(RallyPoint)
        private rallyPointRepo: Repository<RallyPoint>,
        @InjectRepository(PlannedRoute)
        private routeRepo: Repository<PlannedRoute>,
        @InjectRepository(Task)
        private taskRepo: Repository<Task>,
        @InjectRepository(DecisionLog)
        private decisionRepo: Repository<DecisionLog>,
    ) { }

    // ==================== Sectors ====================

    async createSector(data: Partial<Sector>): Promise<Sector> {
        const sector = this.sectorRepo.create(data);
        return this.sectorRepo.save(sector);
    }

    async getSectors(missionSessionId: string): Promise<Sector[]> {
        return this.sectorRepo.find({
            where: { missionSessionId },
            order: { sectorCode: 'ASC' },
        });
    }

    async assignTeamToSector(sectorId: string, dto: SectorAssignDto): Promise<Sector> {
        const sector = await this.sectorRepo.findOne({ where: { id: sectorId } });
        if (!sector) {
            throw new NotFoundException('Sector not found');
        }

        sector.assignedTeamId = dto.teamId;
        sector.assignedTeamName = dto.teamName;
        sector.updatedBy = dto.assignedBy;

        // 記錄決策
        await this.decisionRepo.save({
            missionSessionId: sector.missionSessionId,
            decisionType: DecisionType.SECTOR_ASSIGN,
            description: `指派 ${dto.teamName} 負責 ${sector.name} (${sector.sectorCode})`,
            decidedBy: dto.assignedBy,
            relatedEntityType: 'sector',
            relatedEntityId: sectorId,
            afterState: { teamId: dto.teamId, teamName: dto.teamName },
        });

        return this.sectorRepo.save(sector);
    }

    async updateSectorStatus(sectorId: string, status: SectorStatus, updatedBy: string): Promise<Sector> {
        const sector = await this.sectorRepo.findOne({ where: { id: sectorId } });
        if (!sector) {
            throw new NotFoundException('Sector not found');
        }

        sector.status = status;
        sector.updatedBy = updatedBy;

        return this.sectorRepo.save(sector);
    }

    // ==================== Rally Points ====================

    async createRallyPoint(data: Partial<RallyPoint>): Promise<RallyPoint> {
        // 自動生成 code
        if (!data.code) {
            const count = await this.rallyPointRepo.count({
                where: { missionSessionId: data.missionSessionId, pointType: data.pointType },
            });
            const prefix = data.pointType === 'command' ? 'CMD' :
                data.pointType === 'medical' ? 'MED' :
                    data.pointType === 'supply' ? 'SUP' : 'RP';
            data.code = `${prefix}-${String(count + 1).padStart(2, '0')}`;
        }

        const point = this.rallyPointRepo.create(data);
        return this.rallyPointRepo.save(point);
    }

    async getRallyPoints(missionSessionId: string): Promise<RallyPoint[]> {
        return this.rallyPointRepo.find({
            where: { missionSessionId },
            order: { pointType: 'ASC', code: 'ASC' },
        });
    }

    async updateRallyPointStatus(pointId: string, status: RallyPointStatus): Promise<RallyPoint> {
        const point = await this.rallyPointRepo.findOne({ where: { id: pointId } });
        if (!point) {
            throw new NotFoundException('Rally point not found');
        }

        point.status = status;
        return this.rallyPointRepo.save(point);
    }

    // ==================== Routes ====================

    async createRoute(data: Partial<PlannedRoute>): Promise<PlannedRoute> {
        const route = this.routeRepo.create(data);
        return this.routeRepo.save(route);
    }

    async getRoutes(missionSessionId: string): Promise<PlannedRoute[]> {
        return this.routeRepo.find({
            where: { missionSessionId },
            order: { routeType: 'ASC', name: 'ASC' },
        });
    }

    async updateRouteStatus(routeId: string, status: RouteStatus): Promise<PlannedRoute> {
        const route = await this.routeRepo.findOne({ where: { id: routeId } });
        if (!route) {
            throw new NotFoundException('Route not found');
        }

        route.status = status;
        return this.routeRepo.save(route);
    }

    // ==================== Dispatch ====================

    /**
     * 框選派遣：在 bbox 範圍內建立任務並指派給小隊
     */
    async dispatchFromBbox(dto: BboxDispatchDto): Promise<Task> {
        // 計算中心點
        const centerLng = (dto.bbox.minLng + dto.bbox.maxLng) / 2;
        const centerLat = (dto.bbox.minLat + dto.bbox.maxLat) / 2;

        // 建立任務
        const task = this.taskRepo.create({
            missionSessionId: dto.missionSessionId,
            title: dto.taskTitle,
            description: dto.taskDescription,
            priority: dto.priority || 3,
            status: TaskStatus.ASSIGNED,
            assignedTeamId: dto.teamId,
            assignedTeamName: dto.teamName,
            location: { lat: centerLat, lng: centerLng },
            createdBy: dto.createdBy,
        });

        const savedTask = await this.taskRepo.save(task);

        // 記錄決策
        await this.decisionRepo.save({
            missionSessionId: dto.missionSessionId,
            decisionType: DecisionType.DISPATCH,
            description: `框選派遣：${dto.taskTitle} → ${dto.teamName}`,
            decidedBy: dto.createdBy,
            relatedEntityType: 'task',
            relatedEntityId: savedTask.id,
            afterState: {
                bbox: dto.bbox,
                teamId: dto.teamId,
                teamName: dto.teamName,
            },
        });

        return savedTask;
    }

    /**
     * 派遣至責任區：將任務分配到特定 sector
     */
    async dispatchToSector(
        missionSessionId: string,
        sectorId: string,
        taskTitle: string,
        taskDescription: string,
        createdBy: string,
    ): Promise<Task> {
        const sector = await this.sectorRepo.findOne({ where: { id: sectorId } });
        if (!sector) {
            throw new NotFoundException('Sector not found');
        }

        // 計算 polygon 中心點 (簡化)
        const coords = sector.geometry.coordinates[0];
        const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
        const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

        const task = this.taskRepo.create({
            missionSessionId,
            title: taskTitle,
            description: taskDescription,
            sectorId,
            assignedTeamId: sector.assignedTeamId,
            assignedTeamName: sector.assignedTeamName,
            location: { lat: centerLat, lng: centerLng },
            status: sector.assignedTeamId ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
            createdBy,
        });

        const savedTask = await this.taskRepo.save(task);

        // 記錄決策
        await this.decisionRepo.save({
            missionSessionId,
            decisionType: DecisionType.DISPATCH,
            description: `派遣至責任區：${taskTitle} → ${sector.name}`,
            decidedBy: createdBy,
            relatedEntityType: 'task',
            relatedEntityId: savedTask.id,
            afterState: { sectorId, sectorName: sector.name },
        });

        return savedTask;
    }

    /**
     * 計算 ETA (簡化版：直線距離)
     */
    async calculateETA(
        fromLat: number,
        fromLng: number,
        toLat: number,
        toLng: number,
        speedKmh: number = 30, // 預設 30 km/h
    ): Promise<{ distanceKm: number; estimatedMinutes: number }> {
        // Haversine 公式計算距離
        const R = 6371; // 地球半徑 (km)
        const dLat = this.toRad(toLat - fromLat);
        const dLng = this.toRad(toLng - fromLng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(fromLat)) * Math.cos(this.toRad(toLat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        const estimatedMinutes = Math.round((distanceKm / speedKmh) * 60);

        return { distanceKm: Math.round(distanceKm * 100) / 100, estimatedMinutes };
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
