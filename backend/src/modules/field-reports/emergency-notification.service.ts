import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService, CreateNotificationDto } from '../notifications/notifications.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { Account } from '../accounts/entities/account.entity';
import { Role } from '../accounts/entities/role.entity';

/**
 * Emergency Response Notification Gateway
 * Bridges field reports and SOS events to FCM and LINE notification channels
 */
@Injectable()
export class EmergencyNotificationService {
    private readonly logger = new Logger(EmergencyNotificationService.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly lineBotService: LineBotService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) { }

    /**
     * Get accounts with specific roles (officer, admin, super_admin)
     */
    private async getOfficerAccounts(): Promise<Account[]> {
        return this.accountRepository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.roles', 'role')
            .where('role.name IN (:...roleNames)', {
                roleNames: ['officer', 'admin', 'super_admin', 'super-admin', '最高管理員', '管理員']
            })
            .andWhere('account.isActive = :isActive', { isActive: true })
            .getMany();
    }

    /**
     * Get all active accounts with FCM tokens
     */
    private async getActiveAccountsWithTokens(): Promise<Account[]> {
        return this.accountRepository.find({
            where: { isActive: true },
        });
    }

    /**
     * Send SOS alert to all officers in a mission
     * - FCM push to officers
     * - LINE message to officers with LINE bound
     */
    async sendSosAlert(opts: {
        missionSessionId: string;
        sosId: string;
        userName: string;
        lat: number;
        lng: number;
        message?: string;
    }): Promise<{ fcmCount: number; lineCount: number }> {
        const { missionSessionId, sosId, userName, lat, lng, message } = opts;

        this.logger.log(`Sending SOS alert for mission ${missionSessionId}, SOS ${sosId}`);

        // Find officers
        const officers = await this.getOfficerAccounts();

        const title = '🆘 緊急求救信號';
        const body = message
            ? `${userName}: ${message}`
            : `${userName} 發送緊急求救信號`;
        const actionUrl = `/missions/${missionSessionId}/command?sos=${sosId}`;

        let fcmCount = 0;
        let lineCount = 0;

        // Send FCM push notifications via NotificationsService
        for (const officer of officers) {
            if (officer.fcmTokens && officer.fcmTokens.length > 0) {
                try {
                    const notificationDto: CreateNotificationDto = {
                        accountId: officer.id,
                        type: 'alert',
                        priority: 'urgent',
                        title,
                        message: body,
                        actionUrl,
                        relatedId: sosId,
                        sendPush: true,
                    };
                    await this.notificationsService.create(notificationDto);
                    fcmCount++;
                } catch (err) {
                    this.logger.error(`FCM push failed for ${officer.id}: ${err}`);
                }
            }
        }

        // Send LINE notifications to bound users
        const lineUserIds = officers
            .filter(o => o.lineUserId)
            .map(o => o.lineUserId!);

        if (lineUserIds.length > 0 && this.lineBotService.isEnabled()) {
            try {
                await this.lineBotService.sendDisasterAlert(lineUserIds, {
                    title,
                    description: body,
                    severity: 'critical',
                    location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                });
                lineCount = lineUserIds.length;
            } catch (err) {
                this.logger.error(`LINE multicast failed: ${err}`);
            }
        }

        this.logger.log(`SOS alert sent: FCM=${fcmCount}, LINE=${lineCount}`);
        return { fcmCount, lineCount };
    }

    /**
     * Send task assignment notification to a volunteer
     */
    async sendTaskAssignment(opts: {
        volunteerId: string;
        accountId: string;
        taskId: string;
        taskTitle: string;
        location: string;
        scheduledStart?: string;
    }): Promise<{ fcm: boolean; line: boolean }> {
        const { volunteerId, accountId, taskId, taskTitle, location, scheduledStart } = opts;

        this.logger.log(`Sending task assignment for task ${taskId} to volunteer ${volunteerId}`);

        let fcm = false;
        let line = false;

        // Send FCM notification via existing service
        try {
            await this.notificationsService.sendAssignmentNotification(
                volunteerId,
                taskTitle,
                taskId,
                accountId
            );
            fcm = true;
        } catch (err) {
            this.logger.error(`FCM assignment failed: ${err}`);
        }

        // Send LINE notification if bound
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (account?.lineUserId && this.lineBotService.isEnabled()) {
            try {
                await this.lineBotService.sendTaskAssignment(account.lineUserId, {
                    id: taskId,
                    title: taskTitle,
                    location,
                    scheduledStart: scheduledStart || new Date().toISOString(),
                });
                line = true;
            } catch (err) {
                this.logger.error(`LINE task assignment failed: ${err}`);
            }
        }

        return { fcm, line };
    }

    /**
     * Send new report notification to officers
     */
    async sendNewReportAlert(opts: {
        missionSessionId: string;
        reportId: string;
        reporterName: string;
        reportType: string;
        severity: number;
        lat?: number;
        lng?: number;
    }): Promise<{ fcmCount: number }> {
        const { missionSessionId, reportId, reporterName, reportType, severity } = opts;

        // Only notify for high severity reports (3+)
        if (severity < 3) {
            return { fcmCount: 0 };
        }

        this.logger.log(`Sending new report alert for report ${reportId}`);

        const officers = await this.getOfficerAccounts();

        const title = severity >= 4 ? '⚠️ 緊急回報' : '📋 新回報';
        const body = `${reporterName} 回報: ${reportType}`;
        const actionUrl = `/missions/${missionSessionId}/command?report=${reportId}`;

        let fcmCount = 0;

        for (const officer of officers) {
            if (officer.fcmTokens && officer.fcmTokens.length > 0) {
                try {
                    const notificationDto: CreateNotificationDto = {
                        accountId: officer.id,
                        type: 'alert',
                        priority: severity >= 4 ? 'high' : 'normal',
                        title,
                        message: body,
                        actionUrl,
                        relatedId: reportId,
                        sendPush: true,
                    };
                    await this.notificationsService.create(notificationDto);
                    fcmCount++;
                } catch (err) {
                    this.logger.error(`FCM push failed for ${officer.id}: ${err}`);
                }
            }
        }

        return { fcmCount };
    }

    /**
     * Send SOS acknowledgment notification to the person who triggered SOS
     */
    async sendSosAcknowledged(opts: {
        userId: string;
        sosId: string;
        ackedByName: string;
    }): Promise<{ fcm: boolean; line: boolean }> {
        const { userId, sosId, ackedByName } = opts;

        this.logger.log(`Sending SOS ack for ${sosId} to user ${userId}`);

        let fcm = false;
        let line = false;

        const account = await this.accountRepository.findOne({ where: { id: userId } });
        if (!account) return { fcm, line };

        const title = '✓ SOS 已確認';
        const body = `${ackedByName} 已確認您的求救信號，救援即將到來`;

        // FCM via NotificationsService
        if (account.fcmTokens && account.fcmTokens.length > 0) {
            try {
                const notificationDto: CreateNotificationDto = {
                    accountId: userId,
                    type: 'alert',
                    priority: 'high',
                    title,
                    message: body,
                    relatedId: sosId,
                    sendPush: true,
                };
                await this.notificationsService.create(notificationDto);
                fcm = true;
            } catch (err) {
                this.logger.error(`FCM ack failed: ${err}`);
            }
        }

        // LINE
        if (account.lineUserId && this.lineBotService.isEnabled()) {
            try {
                await this.lineBotService.pushText(account.lineUserId, `${title}\n${body}`);
                line = true;
            } catch (err) {
                this.logger.error(`LINE ack failed: ${err}`);
            }
        }

        return { fcm, line };
    }

    /**
     * Send mobilization alert to all volunteers
     */
    async sendMobilizationAlert(opts: {
        title: string;
        message: string;
        targetVolunteerIds?: string[];
        sendLine?: boolean;
    }): Promise<{ fcmCount: number; lineCount: number }> {
        const { title, message, targetVolunteerIds, sendLine = true } = opts;

        this.logger.log(`Sending mobilization alert: ${title}`);

        let fcmCount = 0;
        let lineCount = 0;

        // Get accounts (all active or specific)
        let accounts: Account[];
        if (targetVolunteerIds && targetVolunteerIds.length > 0) {
            accounts = await this.accountRepository
                .createQueryBuilder('account')
                .where('account.id IN (:...ids)', { ids: targetVolunteerIds })
                .andWhere('account.isActive = :isActive', { isActive: true })
                .getMany();
        } else {
            accounts = await this.getActiveAccountsWithTokens();
        }

        // FCM via NotificationsService
        for (const account of accounts) {
            if (account.fcmTokens && account.fcmTokens.length > 0) {
                try {
                    const notificationDto: CreateNotificationDto = {
                        accountId: account.id,
                        type: 'mobilization',
                        priority: 'urgent',
                        title: `🚨 ${title}`,
                        message,
                        actionUrl: '/mobilization',
                        sendPush: true,
                    };
                    await this.notificationsService.create(notificationDto);
                    fcmCount++;
                } catch (err) {
                    this.logger.error(`FCM mobilization failed for ${account.id}: ${err}`);
                }
            }
        }

        // LINE
        if (sendLine && this.lineBotService.isEnabled()) {
            const lineUserIds = accounts
                .filter(a => a.lineUserId)
                .map(a => a.lineUserId!);

            if (lineUserIds.length > 0) {
                try {
                    await this.lineBotService.sendDisasterAlert(lineUserIds, {
                        title: `🚨 ${title}`,
                        description: message,
                        severity: 'warning',
                    });
                    lineCount = lineUserIds.length;
                } catch (err) {
                    this.logger.error(`LINE mobilization failed: ${err}`);
                }
            }
        }

        this.logger.log(`Mobilization sent: FCM=${fcmCount}, LINE=${lineCount}`);
        return { fcmCount, lineCount };
    }
}
