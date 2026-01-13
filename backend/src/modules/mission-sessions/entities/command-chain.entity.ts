/**
 * Command Chain Entity
 * ICS (事件指揮系統) 指揮鏈架構
 * 
 * 定義任務場次中的角色分配與指揮結構
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

/**
 * ICS 標準角色
 * 參考: FEMA ICS-100, ICS-200
 */
export enum ICSRole {
    // Command Staff
    INCIDENT_COMMANDER = 'incident_commander',      // 事件指揮官 (IC)
    DEPUTY_IC = 'deputy_ic',                        // 副指揮官
    SAFETY_OFFICER = 'safety_officer',              // 安全官
    PUBLIC_INFO_OFFICER = 'public_info_officer',    // 公共資訊官 (PIO)
    LIAISON_OFFICER = 'liaison_officer',            // 聯絡官

    // General Staff
    OPERATIONS_CHIEF = 'operations_chief',          // 作戰組長
    PLANNING_CHIEF = 'planning_chief',              // 計畫組長
    LOGISTICS_CHIEF = 'logistics_chief',            // 後勤組長
    FINANCE_CHIEF = 'finance_admin_chief',          // 財務/行政組長

    // Division/Group Supervisors
    DIVISION_SUPERVISOR = 'division_supervisor',    // 分區督導
    GROUP_SUPERVISOR = 'group_supervisor',          // 群組督導
    BRANCH_DIRECTOR = 'branch_director',            // 分支主任

    // Unit Leaders
    RESOURCES_UNIT = 'resources_unit_leader',       // 資源組
    SITUATION_UNIT = 'situation_unit_leader',       // 情況組
    COMMUNICATIONS_UNIT = 'communications_unit_leader', // 通訊組
    MEDICAL_UNIT = 'medical_unit_leader',           // 醫療組
    FOOD_UNIT = 'food_unit_leader',                 // 飲食組
}

/**
 * 角色狀態
 */
export enum RoleStatus {
    ASSIGNED = 'assigned',      // 已指派
    ACTIVE = 'active',          // 執勤中
    RELIEVED = 'relieved',      // 交接完成
    STANDBY = 'standby',        // 待命中
}

@Entity('command_chain')
@Index(['missionSessionId', 'role'])
@Index(['userId'])
export class CommandChain {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    /**
     * ICS 角色
     */
    @Column({
        type: 'enum',
        enum: ICSRole,
    })
    role: ICSRole;

    /**
     * 指派的使用者
     */
    @Column({ name: 'user_id', type: 'varchar' })
    userId: string;

    @Column({ name: 'user_name', type: 'varchar' })
    userName: string;

    /**
     * 聯絡資訊
     */
    @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
    contactPhone: string;

    @Column({ name: 'contact_radio', type: 'varchar', nullable: true })
    contactRadio: string;

    /**
     * 狀態
     */
    @Column({
        type: 'enum',
        enum: RoleStatus,
        default: RoleStatus.ASSIGNED,
    })
    status: RoleStatus;

    /**
     * 上級角色 (用於建立指揮層級)
     */
    @Column({ name: 'reports_to_id', type: 'uuid', nullable: true })
    reportsToId: string;

    @ManyToOne(() => CommandChain, { nullable: true })
    @JoinColumn({ name: 'reports_to_id' })
    reportsTo: CommandChain;

    /**
     * 指派/交接紀錄
     */
    @Column({ name: 'assigned_by', type: 'varchar' })
    assignedBy: string;

    @Column({ name: 'assigned_at', type: 'timestamptz' })
    assignedAt: Date;

    @Column({ name: 'relieved_by', type: 'varchar', nullable: true })
    relievedBy: string;

    @Column({ name: 'relieved_at', type: 'timestamptz', nullable: true })
    relievedAt: Date;

    @Column({ name: 'relief_notes', type: 'text', nullable: true })
    reliefNotes: string;

    /**
     * 作戰週期關聯 (可選)
     */
    @Column({ name: 'operational_period_id', type: 'uuid', nullable: true })
    operationalPeriodId: string;

    /**
     * 備註
     */
    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

/**
 * 指揮鏈層級定義 (用於 UI 顯示)
 */
export const ICS_HIERARCHY = {
    // Level 1: Command
    [ICSRole.INCIDENT_COMMANDER]: { level: 1, label: '事件指揮官', abbr: 'IC' },
    [ICSRole.DEPUTY_IC]: { level: 1, label: '副指揮官', abbr: 'Deputy IC' },

    // Level 2: Command Staff
    [ICSRole.SAFETY_OFFICER]: { level: 2, label: '安全官', abbr: 'SO' },
    [ICSRole.PUBLIC_INFO_OFFICER]: { level: 2, label: '公共資訊官', abbr: 'PIO' },
    [ICSRole.LIAISON_OFFICER]: { level: 2, label: '聯絡官', abbr: 'LO' },

    // Level 3: General Staff (Section Chiefs)
    [ICSRole.OPERATIONS_CHIEF]: { level: 3, label: '作戰組長', abbr: 'Ops' },
    [ICSRole.PLANNING_CHIEF]: { level: 3, label: '計畫組長', abbr: 'Plan' },
    [ICSRole.LOGISTICS_CHIEF]: { level: 3, label: '後勤組長', abbr: 'Log' },
    [ICSRole.FINANCE_CHIEF]: { level: 3, label: '財務/行政組長', abbr: 'Fin' },

    // Level 4: Branch/Division
    [ICSRole.BRANCH_DIRECTOR]: { level: 4, label: '分支主任', abbr: 'Branch' },
    [ICSRole.DIVISION_SUPERVISOR]: { level: 4, label: '分區督導', abbr: 'Div' },
    [ICSRole.GROUP_SUPERVISOR]: { level: 4, label: '群組督導', abbr: 'Group' },

    // Level 5: Unit Leaders
    [ICSRole.RESOURCES_UNIT]: { level: 5, label: '資源組長', abbr: 'Res' },
    [ICSRole.SITUATION_UNIT]: { level: 5, label: '情況組長', abbr: 'Sit' },
    [ICSRole.COMMUNICATIONS_UNIT]: { level: 5, label: '通訊組長', abbr: 'Comm' },
    [ICSRole.MEDICAL_UNIT]: { level: 5, label: '醫療組長', abbr: 'Med' },
    [ICSRole.FOOD_UNIT]: { level: 5, label: '飲食組長', abbr: 'Food' },
};
