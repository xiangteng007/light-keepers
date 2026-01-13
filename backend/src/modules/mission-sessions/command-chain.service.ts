/**
 * Command Chain Service
 * 管理 ICS 指揮鏈角色分配
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommandChain, ICSRole, RoleStatus, ICS_HIERARCHY } from './entities/command-chain.entity';
import { MissionSession } from './entities/mission-session.entity';

export interface AssignRoleDto {
    missionSessionId: string;
    role: ICSRole;
    userId: string;
    userName: string;
    contactPhone?: string;
    contactRadio?: string;
    reportsToId?: string;
    operationalPeriodId?: string;
    notes?: string;
    assignedBy: string;
}

export interface ReliefDto {
    relievedBy: string;
    newAssigneeId?: string;
    newAssigneeName?: string;
    reliefNotes?: string;
}

@Injectable()
export class CommandChainService {
    private readonly logger = new Logger(CommandChainService.name);

    constructor(
        @InjectRepository(CommandChain)
        private readonly commandChainRepo: Repository<CommandChain>,
        @InjectRepository(MissionSession)
        private readonly sessionRepo: Repository<MissionSession>,
    ) { }

    /**
     * 指派角色
     */
    async assignRole(dto: AssignRoleDto): Promise<CommandChain> {
        // 驗證 mission session 存在
        const session = await this.sessionRepo.findOne({ where: { id: dto.missionSessionId } });
        if (!session) {
            throw new NotFoundException(`Mission session ${dto.missionSessionId} not found`);
        }

        // 檢查該角色是否已有人擔任 (除非是 RELIEVED)
        const existingActive = await this.commandChainRepo.findOne({
            where: {
                missionSessionId: dto.missionSessionId,
                role: dto.role,
                status: RoleStatus.ACTIVE,
            },
        });

        if (existingActive) {
            throw new BadRequestException(
                `Role ${dto.role} is already assigned to ${existingActive.userName}. Please relieve first.`
            );
        }

        const assignment = this.commandChainRepo.create({
            ...dto,
            status: RoleStatus.ASSIGNED,
            assignedAt: new Date(),
        });

        this.logger.log(`Assigning ${dto.role} to ${dto.userName} for mission ${dto.missionSessionId}`);

        return this.commandChainRepo.save(assignment);
    }

    /**
     * 啟動角色 (開始執勤)
     */
    async activateRole(assignmentId: string): Promise<CommandChain> {
        const assignment = await this.commandChainRepo.findOne({ where: { id: assignmentId } });
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.status !== RoleStatus.ASSIGNED && assignment.status !== RoleStatus.STANDBY) {
            throw new BadRequestException('Only ASSIGNED or STANDBY roles can be activated');
        }

        assignment.status = RoleStatus.ACTIVE;
        return this.commandChainRepo.save(assignment);
    }

    /**
     * 交接角色
     */
    async reliefRole(assignmentId: string, dto: ReliefDto): Promise<CommandChain> {
        const assignment = await this.commandChainRepo.findOne({ where: { id: assignmentId } });
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        // 標記現任為已交接
        assignment.status = RoleStatus.RELIEVED;
        assignment.relievedBy = dto.relievedBy;
        assignment.relievedAt = new Date();
        if (dto.reliefNotes) {
            assignment.reliefNotes = dto.reliefNotes;
        }

        await this.commandChainRepo.save(assignment);

        // 如果有指定新接任者，自動建立新指派
        if (dto.newAssigneeId && dto.newAssigneeName) {
            const newAssignment = await this.assignRole({
                missionSessionId: assignment.missionSessionId,
                role: assignment.role,
                userId: dto.newAssigneeId,
                userName: dto.newAssigneeName,
                reportsToId: assignment.reportsToId,
                operationalPeriodId: assignment.operationalPeriodId,
                assignedBy: dto.relievedBy,
            });

            // 自動啟動新角色
            return this.activateRole(newAssignment.id);
        }

        return assignment;
    }

    /**
     * 取得任務場次的指揮鏈
     */
    async getCommandChain(missionSessionId: string): Promise<CommandChain[]> {
        return this.commandChainRepo.find({
            where: { missionSessionId },
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * 取得目前活躍的指揮鏈 (排除已交接)
     */
    async getActiveCommandChain(missionSessionId: string): Promise<CommandChain[]> {
        const chain = await this.commandChainRepo.find({
            where: {
                missionSessionId,
                status: RoleStatus.ACTIVE,
            },
        });

        // 按層級排序
        return chain.sort((a, b) => {
            const levelA = ICS_HIERARCHY[a.role]?.level || 99;
            const levelB = ICS_HIERARCHY[b.role]?.level || 99;
            return levelA - levelB;
        });
    }

    /**
     * 取得特定角色的現任人員
     */
    async getRoleAssignment(missionSessionId: string, role: ICSRole): Promise<CommandChain | null> {
        return this.commandChainRepo.findOne({
            where: {
                missionSessionId,
                role,
                status: RoleStatus.ACTIVE,
            },
        });
    }

    /**
     * 取得使用者在任務中的角色
     */
    async getUserRoles(missionSessionId: string, userId: string): Promise<CommandChain[]> {
        return this.commandChainRepo.find({
            where: {
                missionSessionId,
                userId,
                status: RoleStatus.ACTIVE,
            },
        });
    }

    /**
     * 取得指揮鏈組織圖資料 (用於前端渲染)
     */
    async getOrgChart(missionSessionId: string): Promise<OrgChartNode[]> {
        const chain = await this.getActiveCommandChain(missionSessionId);

        return chain.map(assignment => ({
            id: assignment.id,
            role: assignment.role,
            roleLabel: ICS_HIERARCHY[assignment.role]?.label || assignment.role,
            roleAbbr: ICS_HIERARCHY[assignment.role]?.abbr || '',
            level: ICS_HIERARCHY[assignment.role]?.level || 99,
            userId: assignment.userId,
            userName: assignment.userName,
            contactPhone: assignment.contactPhone,
            contactRadio: assignment.contactRadio,
            reportsToId: assignment.reportsToId,
            status: assignment.status,
            assignedAt: assignment.assignedAt,
        }));
    }

    /**
     * 檢查使用者是否為指揮官或副指揮官
     */
    async isCommander(missionSessionId: string, userId: string): Promise<boolean> {
        const roles = await this.getUserRoles(missionSessionId, userId);
        return roles.some(r =>
            r.role === ICSRole.INCIDENT_COMMANDER ||
            r.role === ICSRole.DEPUTY_IC
        );
    }

    /**
     * 檢查使用者是否為組長級
     */
    async isSectionChief(missionSessionId: string, userId: string): Promise<boolean> {
        const roles = await this.getUserRoles(missionSessionId, userId);
        const chiefRoles = [
            ICSRole.OPERATIONS_CHIEF,
            ICSRole.PLANNING_CHIEF,
            ICSRole.LOGISTICS_CHIEF,
            ICSRole.FINANCE_CHIEF,
        ];
        return roles.some(r => chiefRoles.includes(r.role));
    }
}

/**
 * 組織圖節點 (用於前端)
 */
export interface OrgChartNode {
    id: string;
    role: ICSRole;
    roleLabel: string;
    roleAbbr: string;
    level: number;
    userId: string;
    userName: string;
    contactPhone?: string;
    contactRadio?: string;
    reportsToId?: string;
    status: RoleStatus;
    assignedAt: Date;
}
