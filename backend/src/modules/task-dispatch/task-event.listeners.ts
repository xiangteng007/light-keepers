/**
 * Task Event Listeners
 * 監聽任務事件並觸發通知
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TASK_EVENTS, TaskEventPayload } from './task-dispatch.service';

@Injectable()
export class TaskEventListeners {
    private readonly logger = new Logger(TaskEventListeners.name);

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

        // TODO: 整合 NotificationsService 發送推播
        // await this.notificationsService.sendTaskAssignmentNotification({
        //     taskId: payload.taskId,
        //     title: payload.title,
        //     volunteerIds: payload.volunteerIds,
        //     priority: payload.priority,
        // });

        // TODO: 整合 LINE Bot 發送訊息
        // for (const volunteerId of payload.volunteerIds || []) {
        //     await this.lineBotService.sendTaskAssignment(volunteerId, payload);
        // }
    }

    /**
     * 監聽任務開始事件
     * 觸發: 更新指揮中心狀態、開始追蹤位置
     */
    @OnEvent(TASK_EVENTS.STARTED)
    async handleTaskStarted(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`🚀 Task started: ${payload.taskId}`);
        this.logger.log(`   By volunteer: ${payload.triggeredBy}`);

        // TODO: 開始位置追蹤
        // await this.locationTrackingService.startTracking(payload.triggeredBy, payload.taskId);

        // TODO: 通知指揮中心
        // await this.missionSessionGateway.broadcastTaskUpdate(payload.missionSessionId, {
        //     type: 'TASK_STARTED',
        //     taskId: payload.taskId,
        // });
    }

    /**
     * 監聽任務完成事件
     * 觸發: 更新統計、生成報告
     */
    @OnEvent(TASK_EVENTS.COMPLETED)
    async handleTaskCompleted(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`✅ Task completed: ${payload.taskId}`);
        this.logger.log(`   By volunteer: ${payload.triggeredBy}`);

        // TODO: 停止位置追蹤
        // await this.locationTrackingService.stopTracking(payload.triggeredBy);

        // TODO: 更新任務統計
        // await this.analyticsService.recordTaskCompletion(payload);

        // TODO: 通知指揮中心
        // await this.missionSessionGateway.broadcastTaskUpdate(payload.missionSessionId, {
        //     type: 'TASK_COMPLETED',
        //     taskId: payload.taskId,
        // });
    }

    /**
     * 監聯任務取消事件
     */
    @OnEvent(TASK_EVENTS.CANCELLED)
    async handleTaskCancelled(payload: TaskEventPayload): Promise<void> {
        this.logger.log(`❌ Task cancelled: ${payload.taskId}`);

        // TODO: 通知被指派的志工
        // TODO: 釋放相關資源
    }
}
