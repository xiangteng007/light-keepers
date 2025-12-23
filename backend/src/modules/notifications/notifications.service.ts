import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './notifications.entity';

export interface CreateNotificationDto {
    volunteerId?: string;
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    relatedId?: string;
    expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
    ) { }

    // 建立通知
    async create(dto: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationsRepository.create({
            ...dto,
            priority: dto.priority || 'normal',
            isRead: false,
        });
        const saved = await this.notificationsRepository.save(notification);
        this.logger.log(`Notification created: ${saved.id} - ${saved.title}`);
        return saved;
    }

    // 發送批量通知 (群發動員)
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
        return notifications.length;
    }

    // 發送系統廣播 (所有人)
    async broadcast(dto: Omit<CreateNotificationDto, 'volunteerId'>): Promise<Notification> {
        return this.create({ ...dto, volunteerId: undefined });
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

    // 發送任務指派通知
    async sendAssignmentNotification(volunteerId: string, taskTitle: string, assignmentId: string) {
        return this.create({
            volunteerId,
            type: 'assignment',
            priority: 'high',
            title: '📋 新任務指派',
            message: `您有一個新任務: ${taskTitle}`,
            actionUrl: `/volunteers?assignment=${assignmentId}`,
            relatedId: assignmentId,
        });
    }

    // 發送動員通知
    async sendMobilizationNotification(volunteerIds: string[], title: string, message: string) {
        return this.sendToMultiple(volunteerIds, {
            type: 'mobilization',
            priority: 'urgent',
            title: `🚨 緊急動員: ${title}`,
            message,
        });
    }

    // 發送培訓提醒
    async sendTrainingReminder(volunteerId: string, courseTitle: string, courseId: string) {
        return this.create({
            volunteerId,
            type: 'training',
            priority: 'normal',
            title: '📚 培訓提醒',
            message: `請完成必修課程: ${courseTitle}`,
            actionUrl: `/training/${courseId}`,
            relatedId: courseId,
        });
    }

    // 清理過期通知
    async cleanupExpired(): Promise<number> {
        const result = await this.notificationsRepository.delete({
            expiresAt: LessThan(new Date()),
        });
        return result.affected || 0;
    }
}
