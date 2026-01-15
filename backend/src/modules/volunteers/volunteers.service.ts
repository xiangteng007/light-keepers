import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Volunteer, VolunteerStatus } from './volunteers.entity';
import { AccessLogService } from '../access-log/access-log.service';
import { AccountsService } from '../accounts/accounts.service';
import { CryptoUtil } from '../../common/crypto.util';

export interface CreateVolunteerDto {
    name: string;
    email?: string;
    phone: string;
    region: string;
    address?: string;
    skills: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
    photoUrl?: string;
    accountId?: string; // 關聯的帳號 ID
}

export interface UpdateVolunteerDto {
    name?: string;
    email?: string;
    phone?: string;
    region?: string;
    address?: string;
    skills?: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
    photoUrl?: string;
}

export interface VolunteerFilter {
    status?: VolunteerStatus;
    region?: string;
    skill?: string;
    limit?: number;
    offset?: number;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
}

/**
 * 志工篩選條件 (用於任務派遣)
 */
export interface EligibilityFilter {
    /** 所需技能 (符合任一即可) */
    skills?: string[];
    /** 區域篩選 */
    region?: string;
    /** 是否有交通工具 */
    hasVehicle?: boolean;
    /** 排除已忙碌的志工 */
    excludeBusy?: boolean;
    /** 最大結果數 */
    limit?: number;
    /** 排除特定志工 ID */
    excludeIds?: string[];
    /** 🆕 位置篩選 - 中心點經緯度 */
    centerLat?: number;
    centerLng?: number;
    /** 🆕 最大距離 (公尺) */
    maxDistanceMeters?: number;
}

@Injectable()
export class VolunteersService {
    private readonly logger = new Logger(VolunteersService.name);

    constructor(
        @InjectRepository(Volunteer)
        private volunteersRepository: Repository<Volunteer>,
        private accessLogService: AccessLogService,
        @Inject(forwardRef(() => AccountsService))
        private accountsService: AccountsService,
    ) { }

    // 註冊志工（預設為待審核狀態）
    async create(dto: CreateVolunteerDto): Promise<Volunteer> {
        const volunteer = this.volunteersRepository.create({
            ...dto,
            status: 'offline', // 未審核前為離線狀態
            approvalStatus: 'pending',
            serviceHours: 0,
            taskCount: 0,
        });

        const saved = await this.volunteersRepository.save(volunteer);
        this.logger.log(`New volunteer registered (pending): ${saved.id} - ${saved.name}`);
        return saved;
    }

    // 取得所有志工
    async findAll(filter: VolunteerFilter = {}): Promise<Volunteer[]> {
        const query = this.volunteersRepository.createQueryBuilder('volunteer');

        if (filter.status) {
            query.andWhere('volunteer.status = :status', { status: filter.status });
        }

        if (filter.region) {
            query.andWhere('volunteer.region LIKE :region', { region: `%${filter.region}%` });
        }

        if (filter.skill) {
            query.andWhere('volunteer.skills LIKE :skill', { skill: `%${filter.skill}%` });
        }

        query.orderBy('volunteer.createdAt', 'DESC');

        if (filter.limit) {
            query.take(filter.limit);
        }

        if (filter.offset) {
            query.skip(filter.offset);
        }

        return query.getMany();
    }

    // 🔐 取得志工列表（遮罩敏感資料，用於非管理員）
    async findAllMasked(filter: VolunteerFilter = {}): Promise<Partial<Volunteer>[]> {
        const volunteers = await this.findAll(filter);
        return volunteers.map(v => ({
            id: v.id,
            name: v.name,
            region: v.region,
            skills: v.skills,
            status: v.status,
            serviceHours: v.serviceHours,
            taskCount: v.taskCount,
            phone: CryptoUtil.maskPhone(v.phone), // 🔐 遮罩電話
            createdAt: v.createdAt,
        }));
    }

    // 取得單一志工
    async findOne(id: string): Promise<Volunteer> {
        const volunteer = await this.volunteersRepository.findOne({ where: { id } });
        if (!volunteer) {
            throw new NotFoundException(`Volunteer ${id} not found`);
        }
        return volunteer;
    }

    // 🔐 取得單一志工（含完整資料 + 存取日誌）
    async findOneFull(id: string, accessedBy?: { userId?: string; userName?: string; ipAddress?: string }): Promise<Volunteer> {
        const volunteer = await this.findOne(id);

        // 記錄敏感資料存取
        await this.accessLogService.log({
            userId: accessedBy?.userId,
            userName: accessedBy?.userName,
            action: 'VIEW',
            targetTable: 'volunteers',
            targetId: id,
            sensitiveFieldsAccessed: ['phone', 'address', 'emergencyContact', 'emergencyPhone'],
            ipAddress: accessedBy?.ipAddress,
        });

        this.logger.log(`Full volunteer data accessed: ${id} by ${accessedBy?.userName || 'unknown'}`);
        return volunteer;
    }

    // 更新志工資料
    async update(id: string, dto: UpdateVolunteerDto): Promise<Volunteer> {
        const volunteer = await this.findOne(id);
        Object.assign(volunteer, dto);
        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} updated`);
        return updated;
    }

    // 更新可用狀態
    async updateStatus(id: string, status: VolunteerStatus): Promise<Volunteer> {
        const volunteer = await this.findOne(id);
        volunteer.status = status;
        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} status changed to ${status}`);
        return updated;
    }

    // 取得可用志工 (可派遣)
    async findAvailable(region?: string, skill?: string): Promise<Volunteer[]> {
        return this.findAll({
            status: 'available',
            region,
            skill,
        });
    }

    /**
     * 進階志工篩選 (用於任務派遣)
     * 根據技能、區域、可用狀態等條件篩選符合資格的志工
     */
    async findEligible(filter: EligibilityFilter): Promise<Volunteer[]> {
        const query = this.volunteersRepository.createQueryBuilder('volunteer');

        // 只篩選已審核通過的志工
        query.andWhere('volunteer.approvalStatus = :approvalStatus', { approvalStatus: 'approved' });

        // 排除離線或忙碌狀態
        if (filter.excludeBusy) {
            query.andWhere('volunteer.status = :status', { status: 'available' });
        } else {
            query.andWhere('volunteer.status != :offlineStatus', { offlineStatus: 'offline' });
        }

        // 區域篩選
        if (filter.region) {
            query.andWhere('volunteer.region LIKE :region', { region: `%${filter.region}%` });
        }

        // 技能篩選 (符合任一即可)
        if (filter.skills && filter.skills.length > 0) {
            const skillConditions = filter.skills.map((_, index) =>
                `volunteer.skills LIKE :skill${index}`
            );
            const skillParams = filter.skills.reduce((acc, skill, index) => {
                acc[`skill${index}`] = `%${skill}%`;
                return acc;
            }, {} as Record<string, string>);

            query.andWhere(`(${skillConditions.join(' OR ')})`, skillParams);
        }

        // 排除特定志工
        if (filter.excludeIds && filter.excludeIds.length > 0) {
            query.andWhere('volunteer.id NOT IN (:...excludeIds)', { excludeIds: filter.excludeIds });
        }

        // 排序：優先顯示服務時數較少的志工 (公平派遣)
        query.orderBy('volunteer.taskCount', 'ASC');
        query.addOrderBy('volunteer.serviceHours', 'ASC');

        // 限制結果數
        if (filter.limit) {
            query.take(filter.limit);
        }

        const volunteers = await query.getMany();
        this.logger.log(`Found ${volunteers.length} eligible volunteers with filter: ${JSON.stringify(filter)}`);

        return volunteers;
    }

    /**
     * 根據 LINE User ID 查詢志工
     */
    async findByLineUserId(lineUserId: string): Promise<Volunteer | null> {
        return this.volunteersRepository.findOne({
            where: { lineUserId },
        });
    }

    /**
     * 綁定 LINE User ID
     */
    async bindLineUserId(volunteerId: string, lineUserId: string): Promise<Volunteer> {
        const volunteer = await this.findOne(volunteerId);
        volunteer.lineUserId = lineUserId;
        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${volunteerId} bound to LINE user ${lineUserId}`);
        return updated;
    }

    // 增加服務統計
    async addServiceRecord(id: string, hours: number): Promise<Volunteer> {
        const volunteer = await this.findOne(id);
        volunteer.serviceHours += hours;
        volunteer.taskCount += 1;
        return this.volunteersRepository.save(volunteer);
    }

    // 取得統計
    async getStats(): Promise<{
        total: number;
        available: number;
        busy: number;
        offline: number;
        totalServiceHours: number;
    }> {
        const volunteers = await this.volunteersRepository.find();

        let available = 0, busy = 0, offline = 0, totalServiceHours = 0;

        for (const v of volunteers) {
            // TypeORM decimal 欄位返回字串，需要轉換為數字
            totalServiceHours += parseFloat(String(v.serviceHours)) || 0;
            if (v.status === 'available') available++;
            else if (v.status === 'busy') busy++;
            else if (v.status === 'offline') offline++;
        }

        return {
            total: volunteers.length,
            available,
            busy,
            offline,
            totalServiceHours: Math.round(totalServiceHours), // 取整數
        };
    }

    // 刪除志工 (SEC-SD.1: Soft-delete)
    async delete(id: string): Promise<void> {
        // 先檢查志工是否存在
        const volunteer = await this.volunteersRepository.findOne({ where: { id } });
        if (!volunteer) {
            throw new NotFoundException(`Volunteer ${id} not found`);
        }

        // SEC-SD.1 R4: 使用 softDelete 而非 hard delete
        await this.volunteersRepository.softDelete(id);
        this.logger.log(`Volunteer ${id} soft-deleted`);
    }

    // ===== 審核相關方法 =====

    // 取得待審核志工列表
    async findPending(): Promise<Volunteer[]> {
        return this.volunteersRepository.find({
            where: { approvalStatus: 'pending' },
            order: { createdAt: 'DESC' },
        });
    }

    // 取得已審核通過的志工（用於志工管理列表）
    async findApproved(filter: VolunteerFilter = {}): Promise<Volunteer[]> {
        const query = this.volunteersRepository.createQueryBuilder('volunteer');
        query.andWhere('volunteer.approvalStatus = :approvalStatus', { approvalStatus: 'approved' });

        if (filter.status) {
            query.andWhere('volunteer.status = :status', { status: filter.status });
        }

        if (filter.region) {
            query.andWhere('volunteer.region LIKE :region', { region: `%${filter.region}%` });
        }

        if (filter.skill) {
            query.andWhere('volunteer.skills LIKE :skill', { skill: `%${filter.skill}%` });
        }

        query.orderBy('volunteer.createdAt', 'DESC');

        if (filter.limit) {
            query.take(filter.limit);
        }

        if (filter.offset) {
            query.skip(filter.offset);
        }

        return query.getMany();
    }

    // 審核通過 (同步帳號權限)
    async approve(id: string, approvedBy: string, note?: string): Promise<Volunteer> {
        const volunteer = await this.findOne(id);

        // 1. 更新志工審核狀態
        volunteer.approvalStatus = 'approved';
        volunteer.approvedBy = approvedBy;
        volunteer.approvedAt = new Date();
        volunteer.approvalNote = note || '';
        volunteer.status = 'available'; // 審核通過後設為可用

        // 2. 生成志工編號 (如果沒有)
        if (!volunteer.volunteerCode) {
            volunteer.volunteerCode = await this.generateVolunteerCode();
        }

        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} approved by ${approvedBy}`);

        // 3. 同步帳號權限 - 分配 volunteer role (Level 1)
        if (volunteer.accountId) {
            await this.accountsService.assignRoleInternal(
                volunteer.accountId,
                'volunteer'
            );
            this.logger.log(`Auto-assigned volunteer role to account ${volunteer.accountId}`);
        }

        return updated;
    }

    // 生成志工編號
    private async generateVolunteerCode(): Promise<string> {
        const count = await this.volunteersRepository.count({
            where: { approvalStatus: 'approved' }
        });
        const year = new Date().getFullYear();
        return `LK${year}${String(count + 1).padStart(4, '0')}`; // 例如: LK202400001
    }

    // 拒絕申請 (確保沒有 volunteer role)
    async reject(id: string, rejectedBy: string, note?: string): Promise<Volunteer> {
        const volunteer = await this.findOne(id);

        // 1. 更新志工審核狀態
        volunteer.approvalStatus = 'rejected';
        volunteer.approvedBy = rejectedBy;
        volunteer.approvedAt = new Date();
        volunteer.approvalNote = note || '';

        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} rejected by ${rejectedBy}`);

        // 2. 確保帳號沒有 volunteer role
        if (volunteer.accountId) {
            await this.accountsService.removeRoleInternal(
                volunteer.accountId,
                'volunteer'
            );
            this.logger.log(`Removed volunteer role from account ${volunteer.accountId}`);
        }

        return updated;
    }

    // 暫停志工資格 (降級為 public)
    async suspend(id: string, reason: string): Promise<Volunteer> {
        const volunteer = await this.findOne(id);

        // 1. 更新志工狀態
        volunteer.approvalStatus = 'suspended';
        volunteer.approvalNote = reason;
        volunteer.status = 'offline'; // 暫停時設為離線

        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} suspended: ${reason}`);

        // 2. 降級帳號權限 (移除 volunteer role)
        if (volunteer.accountId) {
            await this.accountsService.removeRoleInternal(
                volunteer.accountId,
                'volunteer'
            );
            this.logger.log(`Removed volunteer role from suspended account ${volunteer.accountId}`);
        }

        return updated;
    }

    // 取得待審核數量
    async getPendingCount(): Promise<number> {
        return this.volunteersRepository.count({
            where: { approvalStatus: 'pending' },
        });
    }
}

