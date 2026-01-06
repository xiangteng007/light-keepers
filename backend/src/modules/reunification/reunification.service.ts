/**
 * Reunification Service
 * Phase 5.4: 災民協尋與平安回報
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissingPerson, MissingPersonStatus } from './entities/missing-person.entity';

@Injectable()
export class ReunificationService {
    private readonly logger = new Logger(ReunificationService.name);

    constructor(
        @InjectRepository(MissingPerson)
        private readonly missingPersonRepository: Repository<MissingPerson>,
    ) { }

    /**
     * 生成查詢碼
     */
    private generateQueryCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ==================== CRUD ====================

    /**
     * 新增失蹤者報案
     */
    async createReport(data: Partial<MissingPerson>): Promise<MissingPerson> {
        const queryCode = this.generateQueryCode();

        const person = this.missingPersonRepository.create({
            ...data,
            queryCode,
            status: MissingPersonStatus.MISSING,
        });

        const saved = await this.missingPersonRepository.save(person);
        this.logger.log(`Missing person reported: ${saved.name} (${queryCode})`);

        return saved;
    }

    /**
     * 透過查詢碼查詢 (公開 API)
     */
    async findByQueryCode(queryCode: string): Promise<{
        found: boolean;
        status?: MissingPersonStatus;
        name?: string;
        foundAt?: Date;
        foundLocation?: string;
        message: string;
    }> {
        const person = await this.missingPersonRepository.findOne({
            where: { queryCode: queryCode.toUpperCase() },
        });

        if (!person) {
            return { found: false, message: '查無此查詢碼' };
        }

        // 隱私保護：僅回傳狀態資訊
        return {
            found: true,
            status: person.status,
            name: person.name,
            foundAt: person.foundAt || undefined,
            foundLocation: person.foundLocation || undefined,
            message: this.getStatusMessage(person.status, person.name),
        };
    }

    private getStatusMessage(status: MissingPersonStatus, name: string): string {
        switch (status) {
            case MissingPersonStatus.MISSING:
                return `${name} 目前仍在搜尋中，請耐心等候。`;
            case MissingPersonStatus.FOUND_SAFE:
                return `${name} 已尋獲且平安！`;
            case MissingPersonStatus.FOUND_INJURED:
                return `${name} 已尋獲，目前正接受醫療照護。`;
            case MissingPersonStatus.REUNITED:
                return `${name} 已與家屬團聚。`;
            default:
                return `${name} 狀態更新中。`;
        }
    }

    /**
     * 更新狀態（尋獲）
     */
    async markFound(
        id: string,
        status: MissingPersonStatus,
        foundData: {
            foundLocation?: string;
            foundCoordinates?: { lat: number; lng: number };
            foundByVolunteerId?: string;
            foundByVolunteerName?: string;
        }
    ): Promise<MissingPerson> {
        const person = await this.missingPersonRepository.findOne({ where: { id } });
        if (!person) throw new NotFoundException('找不到此失蹤者記錄');

        person.status = status;
        person.foundAt = new Date();
        Object.assign(person, foundData);

        const saved = await this.missingPersonRepository.save(person);
        this.logger.log(`Missing person found: ${person.name} (${status})`);

        return saved;
    }

    /**
     * 標記已團聚
     */
    async markReunited(id: string): Promise<MissingPerson> {
        return this.markFound(id, MissingPersonStatus.REUNITED, {});
    }

    /**
     * 取得任務的所有失蹤者
     */
    async getByMission(missionSessionId: string): Promise<MissingPerson[]> {
        return this.missingPersonRepository.find({
            where: { missionSessionId },
            order: { status: 'ASC', createdAt: 'DESC' },
        });
    }

    /**
     * 取得統計
     */
    async getStats(missionSessionId: string): Promise<{
        total: number;
        missing: number;
        foundSafe: number;
        foundInjured: number;
        reunited: number;
    }> {
        const all = await this.getByMission(missionSessionId);

        return {
            total: all.length,
            missing: all.filter(p => p.status === MissingPersonStatus.MISSING).length,
            foundSafe: all.filter(p => p.status === MissingPersonStatus.FOUND_SAFE).length,
            foundInjured: all.filter(p => p.status === MissingPersonStatus.FOUND_INJURED).length,
            reunited: all.filter(p => p.status === MissingPersonStatus.REUNITED).length,
        };
    }
}
