/**
 * Task Event Listeners
 * 監聽任務事件並觸發通知
 * 
 * MC-0 Implementation: Task Dispatch → LINE/Push Notification Integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TASK_EVENTS, TaskEventPayload } from './task-dispatch.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Account } from '../accounts/entities/account.entity';

@Injectable()
export class TaskEventListeners {
    private readonly logger = new Logger(TaskEventListeners.name);

    constructor(
        private readonly lineBotService: LineBotService,
        private readonly notificationsService: NotificationsService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {}

    /**
     * 監聽任務指派事件
     * 觸發: 推播通知給被指派的志工
     */
    @OnEvent(TASK_EVENTS.ASSIGNED)
    async handleTaskAssigned(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`📨 Task assigned: ${payload.taskId}`);
        this.logger.log(`   Volunteers: ${payload.volunteerIds?.join(', ')}`);
        this.logger.log(`   Title: ${payload.title}`);
        this.logger.log(`   Priority: ${payload.priority}`);

        const volunteerIds = payload.volunteerIds || [];
        if (volunteerIds.length === 0) {
            this.logger.warn('No volunteers to notify');
            return;
        }
        // 注意: sendToMultiple 內部已經會發送 FCM 推播，不需要額外呼叫
        // FCM 推播會在建立系統通知時自動發送

        // 發送 LINE 訊息給有綁定帳號的志工
        try {
            // 查詢有 LINE 綁定的帳號
            const accounts = await this.accountRepository.find({
                where: { 
                    id: volunteerIds.length > 0 ? volunteerIds[0] as any : undefined,
                },
            });

            // 查詢所有有 lineUserId 的帳號
            const lineAccounts = await this.accountRepository
                .createQueryBuilder('account')
                .where('account.id IN (:...ids)', { ids: volunteerIds })
                .andWhere('account.lineUserId IS NOT NULL')
                .getMany();

            let lineSentCount = 0;
            for (const account of lineAccounts) {
                if (account.lineUserId) {
                    try {
                        await this.lineBotService.sendTaskAssignment(account.lineUserId, {
                            id: payload.taskId,
                            title: payload.title || '新任務',
                            location: '待確認', // TaskEventPayload doesn't have location
                            scheduledStart: payload.timestamp.toISOString(),
                        });
                        lineSentCount++;
                    } catch (lineError) {
                        this.logger.error(`Failed to send LINE message to ${account.id}`, lineError);
                    }
                }
            }
            this.logger.log(`✅ LINE notifications sent to ${lineSentCount} volunteers`);
        } catch (error) {
            this.logger.error('Failed to send LINE notifications', error);
        }

        // 建立系統通知記錄
        try {
            await this.notificationsService.sendToMultiple(volunteerIds, {
                type: 'assignment',
                priority: String(payload.priority) === 'urgent' ? 'high' : 'normal',
                title: `📋 任務指派: ${payload.title}`,
                message: `您已被指派到新任務，請盡快確認接受。`,
                actionUrl: `/tasks/${payload.taskId}`,
                relatedId: payload.taskId,
            });
        } catch (error) {
            this.logger.error('Failed to create notification records', error);
        }
    }

    /**
     * 監聽任務開始事件
     * 觸發: 更新指揮中心狀態、開始追蹤位置
     */
    @OnEvent(TASK_EVENTS.STARTED)
    async handleTaskStarted(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`🚀 Task started: ${payload.taskId}`);
        this.logger.log(`   By volunteer: ${payload.triggeredBy}`);

        // TODO: 開始位置追蹤 (需要 LocationTrackingService)
        // await this.locationTrackingService.startTracking(payload.triggeredBy, payload.taskId);

        // 發送指揮中心通知 (透過 WebSocket Gateway 已在其他地方處理)
        this.logger.log(`   [WebSocket] Task start event broadcasted`);
    }

    /**
     * 監聽任務完成事件
     * 觸發: 更新統計、生成報告
     */
    @OnEvent(TASK_EVENTS.COMPLETED)
    async handleTaskCompleted(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`✅ Task completed: ${payload.taskId}`);
        this.logger.log(`   By volunteer: ${payload.triggeredBy}`);

        // TODO: 停止位置追蹤 (需要 LocationTrackingService)
        // await this.locationTrackingService.stopTracking(payload.triggeredBy);

        // 發送完成通知給任務建立者
        if (payload.missionSessionId) {
            try {
                await this.notificationsService.broadcast({
                    type: 'system',
                    priority: 'normal',
                    title: `✅ 任務完成: ${payload.title}`,
                    message: `任務已由志工完成。`,
                    actionUrl: `/tasks/${payload.taskId}`,
                    relatedId: payload.taskId,
                });
            } catch (error) {
                this.logger.error('Failed to send completion notification', error);
            }
        }
    }

    /**
     * 監聯任務取消事件
     */
    @OnEvent(TASK_EVENTS.CANCELLED)
    async handleTaskCancelled(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`❌ Task cancelled: ${payload.taskId}`);

        const volunteerIds = payload.volunteerIds || [];
        if (volunteerIds.length === 0) {
            return;
        }

        // 通知被指派的志工任務已取消
        try {
            await this.notificationsService.sendToMultiple(volunteerIds, {
                type: 'system',
                priority: 'normal',
                title: `❌ 任務取消: ${payload.title}`,
                message: `您被指派的任務已被取消。`,
                actionUrl: `/tasks/${payload.taskId}`,
                relatedId: payload.taskId,
            });
            this.logger.log(`✅ Cancellation notifications sent to ${volunteerIds.length} volunteers`);
        } catch (error) {
            this.logger.error('Failed to send cancellation notifications', error);
        }
    }
}
