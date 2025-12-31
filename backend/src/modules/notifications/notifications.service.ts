import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, In } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './notifications.entity';
import { FirebaseAdminService } from '../auth/services/firebase-admin.service';
import { Account } from '../accounts/entities/account.entity';

export interface CreateNotificationDto {
    volunteerId?: string;
    accountId?: string; // 支援 Account ID
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    relatedId?: string;
    expiresAt?: Date;
    sendPush?: boolean; // 是否發送推播
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
        @InjectRepository(Account)
        private accountRepository: Repository<Account>,
        private readonly firebaseAdminService: FirebaseAdminService,
    ) { }

    // 建立通知 (並同步發送 FCM 推播)
    async create(dto: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationsRepository.create({
            ...dto,
            priority: dto.priority || 'normal',
            isRead: false,
        });
        const saved = await this.notificationsRepository.save(notification);
        this.logger.log(`Notification created: ${saved.id} - ${saved.title}`);

        // 同步發送 FCM 推播 (非阻塞)
        if (dto.sendPush !== false && dto.accountId) {
            this.sendPushForAccount(dto.accountId, dto.title, dto.message, dto.actionUrl).catch(err => {
                this.logger.warn(`FCM push failed for account ${dto.accountId}: ${err.message}`);
            });
        }

        return saved;
    }

    // 發送批量通知 (群發動員) + FCM 推播
    async sendToMultiple(volunteerIds: string[], dto: Omit<CreateNotificationDto, 'volunteerId'>): Promise<number> {
        const notifications = volunteerIds.map(volunteerId =>
            this.notificationsRepository.create({
                ...dto,
                volunteerId,
                priority: dto.priority || 'normal',
                isRead: false,
            })
        );
        await this.notificationsRepository.save(notifications);
        this.logger.log(`Sent ${notifications.length} notifications: ${dto.title}`);

        // 發送 FCM 推播到所有志工 (非阻塞)
        this.sendPushToVolunteers(volunteerIds, dto.title, dto.message, dto.actionUrl).catch(err => {
            this.logger.warn(`FCM multicast failed: ${err.message}`);
        });

        return notifications.length;
    }

    // 發送 FCM 推播到單一帳號的所有裝置
    private async sendPushForAccount(accountId: string, title: string, body: string, actionUrl?: string): Promise<void> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account?.fcmTokens?.length) {
            return;
        }

        const data: Record<string, string> = {};
        if (actionUrl) data.actionUrl = actionUrl;

        const result = await this.firebaseAdminService.sendMulticastPush(
            account.fcmTokens,
            title,
            body,
            data
        );

        // 清理無效的 Token
        if (result.invalidTokens.length > 0) {
            await this.removeInvalidTokens(accountId, result.invalidTokens);
        }
    }

    // 發送 FCM 推播到多個志工
    private async sendPushToVolunteers(volunteerIds: string[], title: string, body: string, actionUrl?: string): Promise<void> {
        // 獲取所有志工的 FCM Token
        // Note: 這裡假設 volunteerId 可以映射到 accountId
        // 實際實作可能需要 JOIN volunteers 表
        const allTokens: string[] = [];
        const tokenAccountMap: Map<string, string> = new Map();

        // 批量查詢帳號 (假設 volunteerId 與 accountId 相同或有關聯)
        const accounts = await this.accountRepository.find({
            where: { id: In(volunteerIds) },
            select: ['id', 'fcmTokens'],
        });

        accounts.forEach(account => {
            if (account.fcmTokens?.length) {
                account.fcmTokens.forEach(token => {
                    allTokens.push(token);
                    tokenAccountMap.set(token, account.id);
                });
            }
        });

        if (allTokens.length === 0) {
            return;
        }

        const data: Record<string, string> = {};
        if (actionUrl) data.actionUrl = actionUrl;

        const result = await this.firebaseAdminService.sendMulticastPush(
            allTokens,
            title,
            body,
            data
        );

        this.logger.log(`FCM multicast to ${volunteerIds.length} volunteers: ${result.successCount} success, ${result.failureCount} failed`);

        // 清理無效的 Token
        if (result.invalidTokens.length > 0) {
            const accountsToClean = new Set<string>();
            result.invalidTokens.forEach(token => {
                const accountId = tokenAccountMap.get(token);
                if (accountId) accountsToClean.add(accountId);
            });

            for (const accountId of accountsToClean) {
                const invalidForAccount = result.invalidTokens.filter(t => tokenAccountMap.get(t) === accountId);
                await this.removeInvalidTokens(accountId, invalidForAccount);
            }
        }
    }

    // 移除帳號中無效的 FCM Token
    private async removeInvalidTokens(accountId: string, invalidTokens: string[]): Promise<void> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account?.fcmTokens) return;

        const validTokens = account.fcmTokens.filter(t => !invalidTokens.includes(t));
        await this.accountRepository.update(accountId, { fcmTokens: validTokens });
        this.logger.log(`Removed ${invalidTokens.length} invalid FCM tokens for account ${accountId}`);
    }

    // 發送系統廣播 (所有人)
    async broadcast(dto: Omit<CreateNotificationDto, 'volunteerId'>): Promise<Notification> {
        return this.create({ ...dto, volunteerId: undefined });
    }

    // 發送系統廣播到所有裝置 (使用 Topic)
    async broadcastWithPush(title: string, message: string, actionUrl?: string): Promise<void> {
        // 建立通知記錄
        await this.broadcast({
            type: 'system',
            priority: 'high',
            title,
            message,
            actionUrl,
        });

        // 發送到 'all' 主題
        const data: Record<string, string> = {};
        if (actionUrl) data.actionUrl = actionUrl;

        await this.firebaseAdminService.sendTopicPush('all_users', title, message, data);
    }

    // 取得志工通知
    async getByVolunteer(volunteerId: string, unreadOnly = false): Promise<Notification[]> {
        const query = this.notificationsRepository.createQueryBuilder('n')
            .where('(n.volunteerId = :volunteerId OR n.volunteerId IS NULL)', { volunteerId })
            .andWhere('(n.expiresAt IS NULL OR n.expiresAt > :now)', { now: new Date() });

        if (unreadOnly) {
            query.andWhere('n.isRead = false');
        }

        return query.orderBy('n.createdAt', 'DESC').take(50).getMany();
    }

    // 取得未讀數量
    async getUnreadCount(volunteerId: string): Promise<number> {
        return this.notificationsRepository.count({
            where: [
                { volunteerId, isRead: false },
                { volunteerId: IsNull(), isRead: false },
            ],
        });
    }

    // 標記已讀
    async markAsRead(id: string): Promise<Notification | null> {
        const notification = await this.notificationsRepository.findOne({ where: { id } });
        if (notification) {
            notification.isRead = true;
            notification.readAt = new Date();
            return this.notificationsRepository.save(notification);
        }
        return null;
    }

    // 標記全部已讀
    async markAllAsRead(volunteerId: string): Promise<number> {
        const result = await this.notificationsRepository.update(
            { volunteerId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        return result.affected || 0;
    }

    // 發送任務指派通知 (含 FCM)
    async sendAssignmentNotification(volunteerId: string, taskTitle: string, assignmentId: string, accountId?: string) {
        return this.create({
            volunteerId,
            accountId,
            type: 'assignment',
            priority: 'high',
            title: '📋 新任務指派',
            message: `您有一個新任務: ${taskTitle}`,
            actionUrl: `/volunteers?assignment=${assignmentId}`,
            relatedId: assignmentId,
            sendPush: true,
        });
    }

    // 發送動員通知 (含 FCM)
    async sendMobilizationNotification(volunteerIds: string[], title: string, message: string) {
        return this.sendToMultiple(volunteerIds, {
            type: 'mobilization',
            priority: 'urgent',
            title: `🚨 緊急動員: ${title}`,
            message,
        });
    }

    // 發送培訓提醒 (含 FCM)
    async sendTrainingReminder(volunteerId: string, courseTitle: string, courseId: string, accountId?: string) {
        return this.create({
            volunteerId,
            accountId,
            type: 'training',
            priority: 'normal',
            title: '📚 培訓提醒',
            message: `請完成必修課程: ${courseTitle}`,
            actionUrl: `/training/${courseId}`,
            relatedId: courseId,
            sendPush: true,
        });
    }

    // 清理過期通知
    async cleanupExpired(): Promise<number> {
        const result = await this.notificationsRepository.delete({
            expiresAt: LessThan(new Date()),
        });
        return result.affected || 0;
    }

    // =========================================
    // FCM Token 管理
    // =========================================

    // 註冊 FCM Token
    async registerFcmToken(accountId: string, fcmToken: string): Promise<boolean> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) return false;

        const tokens = account.fcmTokens || [];
        if (!tokens.includes(fcmToken)) {
            tokens.push(fcmToken);
            await this.accountRepository.update(accountId, { fcmTokens: tokens });
            this.logger.log(`Registered FCM token for account ${accountId}`);

            // 訂閱到 all_users 主題
            await this.firebaseAdminService.subscribeToTopic([fcmToken], 'all_users');
        }
        return true;
    }

    // 取消註冊 FCM Token
    async unregisterFcmToken(accountId: string, fcmToken: string): Promise<boolean> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account?.fcmTokens) return false;

        const tokens = account.fcmTokens.filter(t => t !== fcmToken);
        await this.accountRepository.update(accountId, { fcmTokens: tokens });
        this.logger.log(`Unregistered FCM token for account ${accountId}`);

        // 取消訂閱主題
        await this.firebaseAdminService.unsubscribeFromTopic([fcmToken], 'all_users');
        return true;
    }
}

