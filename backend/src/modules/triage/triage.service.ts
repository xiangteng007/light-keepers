/**
 * Triage Service
 * Phase 5.1: E-Triage 數位檢傷分類系統
 * 
 * 基於 START (Simple Triage and Rapid Treatment) 檢傷法
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Victim, TriageLevel, TransportStatus } from './entities/victim.entity';
import { MedicalLog, TreatmentType } from './entities/medical-log.entity';
import { CreateVictimDto, UpdateTriageDto, StartTransportDto, AddMedicalLogDto, TriageStatsDto } from './dto/triage.dto';

@Injectable()
export class TriageService {
    private readonly logger = new Logger(TriageService.name);

    constructor(
        @InjectRepository(Victim)
        private readonly victimRepository: Repository<Victim>,
        @InjectRepository(MedicalLog)
        private readonly medicalLogRepository: Repository<MedicalLog>,
    ) { }

    // ==================== START Algorithm ====================

    /**
     * 根據 START 檢傷法自動計算分類等級
     */
    calculateTriageLevel(assessment: {
        canWalk?: boolean;
        breathing?: boolean;
        respiratoryRate?: number;
        hasRadialPulse?: boolean;
        capillaryRefillTime?: number;
        canFollowCommands?: boolean;
    }): TriageLevel {
        // Step 1: 能行走嗎？ → GREEN
        if (assessment.canWalk) {
            return TriageLevel.GREEN;
        }

        // Step 2: 有呼吸嗎？
        if (!assessment.breathing) {
            // 嘗試打開呼吸道後仍無呼吸 → BLACK
            return TriageLevel.BLACK;
        }

        // Step 3: 呼吸頻率
        const rr = assessment.respiratoryRate;
        if (rr !== undefined) {
            if (rr > 30 || rr < 10) {
                // 呼吸過快或過慢 → RED
                return TriageLevel.RED;
            }
        }

        // Step 4: 循環評估 (橈動脈或微血管回填)
        if (!assessment.hasRadialPulse) {
            return TriageLevel.RED;
        }
        if (assessment.capillaryRefillTime !== undefined && assessment.capillaryRefillTime > 2) {
            return TriageLevel.RED;
        }

        // Step 5: 意識評估
        if (!assessment.canFollowCommands) {
            return TriageLevel.RED;
        }

        // 通過所有檢查 → YELLOW
        return TriageLevel.YELLOW;
    }

    // ==================== CRUD Operations ====================

    /**
     * 建立傷患記錄 (自動計算 START 等級)
     */
    async createVictim(dto: CreateVictimDto): Promise<Victim> {
        // 自動計算 START 等級
        const triageLevel = this.calculateTriageLevel({
            canWalk: dto.canWalk,
            breathing: dto.breathing,
            respiratoryRate: dto.respiratoryRate,
            hasRadialPulse: dto.hasRadialPulse,
            capillaryRefillTime: dto.capillaryRefillTime,
            canFollowCommands: dto.canFollowCommands,
        });

        const victim = this.victimRepository.create({
            ...dto,
            triageLevel,
        });

        const saved = await this.victimRepository.save(victim);

        // 記錄初始評估
        await this.addMedicalLog(saved.id, {
            type: TreatmentType.TRIAGE_ASSESSMENT,
            content: `初始檢傷評估: ${triageLevel}`,
            performerId: dto.assessorId,
            performerName: dto.assessorName,
            location: dto.discoveryLocation,
        });

        this.logger.log(`Victim created: ${saved.id} (${triageLevel})`);
        return saved;
    }

    /**
     * 依 ID 取得傷患
     */
    async getVictim(id: string): Promise<Victim> {
        const victim = await this.victimRepository.findOne({
            where: { id },
            relations: ['medicalLogs'],
        });

        if (!victim) {
            throw new NotFoundException('傷患記錄不存在');
        }

        return victim;
    }

    /**
     * 透過手環 ID 查詢
     */
    async getVictimByBracelet(braceletId: string): Promise<Victim> {
        const victim = await this.victimRepository.findOne({
            where: { braceletId },
            relations: ['medicalLogs'],
        });

        if (!victim) {
            throw new NotFoundException('手環 ID 未綁定傷患');
        }

        return victim;
    }

    /**
     * 取得任務場次的所有傷患
     */
    async getVictimsByMission(missionSessionId: string): Promise<Victim[]> {
        return this.victimRepository.find({
            where: { missionSessionId },
            relations: ['medicalLogs'],
            order: {
                triageLevel: 'ASC', // BLACK, RED, YELLOW, GREEN
                createdAt: 'DESC',
            },
        });
    }

    /**
     * 更新檢傷評估
     */
    async updateTriage(
        victimId: string,
        dto: UpdateTriageDto,
        performerId?: string,
        performerName?: string
    ): Promise<Victim> {
        const victim = await this.getVictim(victimId);
        const oldLevel = victim.triageLevel;

        // 如果有新的評估數據，重新計算等級
        let newLevel = dto.triageLevel;
        if (!newLevel) {
            newLevel = this.calculateTriageLevel({
                canWalk: dto.canWalk ?? victim.canWalk,
                breathing: dto.breathing ?? victim.breathing,
                respiratoryRate: dto.respiratoryRate ?? victim.respiratoryRate,
                hasRadialPulse: dto.hasRadialPulse ?? victim.hasRadialPulse,
                capillaryRefillTime: dto.capillaryRefillTime ?? victim.capillaryRefillTime,
                canFollowCommands: dto.canFollowCommands ?? victim.canFollowCommands,
            });
        }

        Object.assign(victim, dto, { triageLevel: newLevel });
        const saved = await this.victimRepository.save(victim);

        // 記錄等級變更
        if (oldLevel !== newLevel) {
            const logType = this.getLevelValue(newLevel) < this.getLevelValue(oldLevel)
                ? TreatmentType.TRIAGE_UPGRADE
                : TreatmentType.TRIAGE_DOWNGRADE;

            await this.addMedicalLog(victimId, {
                type: logType,
                content: `檢傷等級: ${oldLevel} → ${newLevel}`,
                performerId,
                performerName,
            });
        }

        return saved;
    }

    /**
     * 開始運送
     */
    async startTransport(victimId: string, dto: StartTransportDto): Promise<Victim> {
        const victim = await this.getVictim(victimId);

        if (victim.transportStatus !== TransportStatus.PENDING) {
            throw new BadRequestException('傷患已在運送中或已到達');
        }

        victim.transportStatus = TransportStatus.IN_TRANSIT;
        victim.hospitalId = dto.hospitalId;
        victim.hospitalName = dto.hospitalName;
        victim.ambulanceId = dto.ambulanceId;
        victim.estimatedArrival = dto.estimatedArrival;

        const saved = await this.victimRepository.save(victim);

        await this.addMedicalLog(victimId, {
            type: TreatmentType.TRANSPORT_START,
            content: `開始運送至 ${dto.hospitalName}`,
            metadata: { hospitalId: dto.hospitalId, ambulanceId: dto.ambulanceId },
        });

        return saved;
    }

    /**
     * 確認到達醫院
     */
    async confirmArrival(victimId: string): Promise<Victim> {
        const victim = await this.getVictim(victimId);

        if (victim.transportStatus !== TransportStatus.IN_TRANSIT) {
            throw new BadRequestException('傷患尚未開始運送');
        }

        victim.transportStatus = TransportStatus.ARRIVED;
        victim.actualArrival = new Date();

        const saved = await this.victimRepository.save(victim);

        await this.addMedicalLog(victimId, {
            type: TreatmentType.TRANSPORT_ARRIVED,
            content: `已到達 ${victim.hospitalName}`,
        });

        return saved;
    }

    // ==================== Medical Logs ====================

    /**
     * 新增醫療處置記錄
     */
    async addMedicalLog(victimId: string, dto: AddMedicalLogDto): Promise<MedicalLog> {
        const log = this.medicalLogRepository.create({
            victimId,
            ...dto,
        });

        return this.medicalLogRepository.save(log);
    }

    /**
     * 取得傷患的所有處置記錄
     */
    async getMedicalLogs(victimId: string): Promise<MedicalLog[]> {
        return this.medicalLogRepository.find({
            where: { victimId },
            order: { timestamp: 'DESC' },
        });
    }

    // ==================== Statistics ====================

    /**
     * 取得任務場次的統計資料
     */
    async getStats(missionSessionId: string): Promise<TriageStatsDto> {
        const victims = await this.victimRepository.find({
            where: { missionSessionId },
        });

        return {
            total: victims.length,
            black: victims.filter(v => v.triageLevel === TriageLevel.BLACK).length,
            red: victims.filter(v => v.triageLevel === TriageLevel.RED).length,
            yellow: victims.filter(v => v.triageLevel === TriageLevel.YELLOW).length,
            green: victims.filter(v => v.triageLevel === TriageLevel.GREEN).length,
            pendingTransport: victims.filter(v => v.transportStatus === TransportStatus.PENDING).length,
            inTransit: victims.filter(v => v.transportStatus === TransportStatus.IN_TRANSIT).length,
            arrived: victims.filter(v => v.transportStatus === TransportStatus.ARRIVED).length,
        };
    }

    // ==================== Helpers ====================

    private getLevelValue(level: TriageLevel): number {
        const values = {
            [TriageLevel.BLACK]: 0,
            [TriageLevel.RED]: 1,
            [TriageLevel.YELLOW]: 2,
            [TriageLevel.GREEN]: 3,
        };
        return values[level];
    }
}
