import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportSeverity, ReportType } from './reports.entity';
import { Task } from '../tasks/entities';
import { Account } from '../accounts/entities';
import { LineBotService } from '../line-bot/line-bot.service';

/**
 * 嚴重程度對應的任務優先級
 */
const SEVERITY_TO_PRIORITY: Record<ReportSeverity, number> = {
    critical: 5,  // highest
    high: 4,
    medium: 3,
    low: 2,
};

/**
 * 災害類型對應的技能標籤
 */
const TYPE_TO_SKILLS: Record<ReportType, string[]> = {
    earthquake: ['搜救', '救援'],
    flood: ['水域救援', '抽水'],
    fire: ['消防', '滅火'],
    typhoon: ['防災', '救援'],
    landslide: ['搜救', '重機械'],
    traffic: ['交通管制', '救援'],
    infrastructure: ['電氣', '工程'],
    other: [],
};

@Injectable()
export class ReportDispatcherService {
    private readonly logger = new Logger(ReportDispatcherService.name);

    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @Inject(forwardRef(() => LineBotService))
        private readonly lineBotService: LineBotService,
    ) { }

    /**
     * 從已確認的回報自動建立調度任務
     * @param reportId 回報 ID
     * @returns 建立的任務 (若不需自動調度則回傳 null)
     */
    async autoDispatch(reportId: string): Promise<Task | null> {
        const report = await this.reportRepository.findOne({ where: { id: reportId } });

        if (!report) {
            this.logger.warn(`Report ${reportId} not found for auto-dispatch`);
            return null;
        }

        if (report.status !== 'confirmed') {
            this.logger.warn(`Report ${reportId} is not confirmed, skipping dispatch`);
            return null;
        }

        // 檢查是否已有關聯任務 (避免重複建立)
        const existingTask = await this.taskRepository.findOne({
            where: { sourceReportId: reportId },
        });

        if (existingTask) {
            this.logger.log(`Task already exists for report ${reportId}: ${existingTask.id}`);
            return existingTask;
        }

        // 建立新任務
        const task = this.taskRepository.create({
            title: `[自動調度] ${report.title}`,
            description: this.buildTaskDescription(report),
            priority: SEVERITY_TO_PRIORITY[report.severity] || 3,
            status: 'pending',
            sourceReportId: reportId,
            address: report.address || undefined,
            dueAt: this.calculateDueAt(report.severity),
        });

        const savedTask = await this.taskRepository.save(task);
        this.logger.log(`📋 Auto-dispatched task ${savedTask.id} from report ${reportId}`);

        // 嘗試自動指派志工
        await this.tryAssignVolunteer(savedTask, report);

        return savedTask;
    }

    /**
     * 嘗試根據災害類型自動指派合適的志工
     */
    private async tryAssignVolunteer(task: Task, report: Report): Promise<void> {
        try {
            // 查找有 LINE 綁定且可用的志工
            const availableVolunteers = await this.accountRepository
                .createQueryBuilder('account')
                .where('account.lineUserId IS NOT NULL')
                .andWhere('account.roleLevel >= :minLevel', { minLevel: 10 }) // 志工以上
                .orderBy('RANDOM()')  // 隨機選取 (可改為更智慧的匹配)
                .limit(1)
                .getMany();

            if (availableVolunteers.length === 0) {
                this.logger.log(`No available volunteers for task ${task.id}`);
                return;
            }

            const assignee = availableVolunteers[0];

            // 更新任務指派
            task.assignedTo = assignee.id;
            await this.taskRepository.save(task);

            // 發送 LINE 通知
            if (assignee.lineUserId) {
                await this.lineBotService.sendTaskAssignment(assignee.lineUserId, {
                    id: task.id,
                    title: task.title,
                    location: report.address || `${report.latitude}, ${report.longitude}`,
                    scheduledStart: task.dueAt?.toISOString() || '待確認',
                });
                this.logger.log(`📱 Sent task notification to ${assignee.displayName}`);
            }
        } catch (error) {
            this.logger.warn(`Failed to auto-assign volunteer: ${error.message}`);
        }
    }

    /**
     * 組建任務描述
     */
    private buildTaskDescription(report: Report): string {
        const lines: string[] = [
            `📍 地點: ${report.address || `${report.latitude}, ${report.longitude}`}`,
            `📝 描述: ${report.description}`,
            `🏷️ 類型: ${this.translateType(report.type)}`,
            `⚠️ 嚴重程度: ${this.translateSeverity(report.severity)}`,
        ];

        if (report.contactName) {
            lines.push(`👤 聯絡人: ${report.contactName}`);
        }
        if (report.contactPhone) {
            lines.push(`📞 電話: ${report.contactPhone}`);
        }
        if (report.photos && report.photos.length > 0) {
            lines.push(`📷 照片: ${report.photos.length} 張`);
        }

        lines.push(`\n🔗 來源回報 ID: ${report.id}`);

        return lines.join('\n');
    }

    /**
     * 根據嚴重程度計算任務到期時間
     */
    private calculateDueAt(severity: ReportSeverity): Date {
        const now = new Date();
        const hoursMap: Record<ReportSeverity, number> = {
            critical: 2,   // 2 小時內
            high: 6,       // 6 小時內
            medium: 24,    // 24 小時內
            low: 72,       // 72 小時內
        };
        const hours = hoursMap[severity] || 24;
        return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }

    private translateType(type: ReportType): string {
        const map: Record<ReportType, string> = {
            earthquake: '地震',
            flood: '水災',
            fire: '火災',
            typhoon: '颱風',
            landslide: '土石流',
            traffic: '交通事故',
            infrastructure: '基礎設施',
            other: '其他',
        };
        return map[type] || type;
    }

    private translateSeverity(severity: ReportSeverity): string {
        const map: Record<ReportSeverity, string> = {
            critical: '🔴 緊急',
            high: '🟠 高',
            medium: '🟡 中',
            low: '🟢 低',
        };
        return map[severity] || severity;
    }
}
