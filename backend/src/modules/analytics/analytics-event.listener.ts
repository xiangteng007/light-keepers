/**
 * analytics-event.listener.ts
 * 
 * v2.1: 分析與報表事件監聽器
 * 監聽分析相關事件並處理報表生成、AAR 發布等
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    ANALYTICS_EVENTS,
    INCIDENT_EVENTS,
    IncidentEventPayload,
} from '../../common/events';

export interface AARPublishedPayload {
    aarId: string;
    incidentId: string;
    title: string;
    userId?: string;
    aiGenerated?: boolean;
}

export interface ReportJobCompletedPayload {
    jobId: string;
    reportType: string;
    outputUrl?: string;
    userId?: string;
}

export interface AISummaryGeneratedPayload {
    summaryId: string;
    incidentId?: string;
    taskId?: string;
    summary: string;
    evidenceRefs?: string[];
}

@Injectable()
export class AnalyticsEventListener {
    private readonly logger = new Logger(AnalyticsEventListener.name);

    constructor(private readonly eventEmitter: EventEmitter2) { }

    /**
     * 當 Incident 完成時，提示可以建立 AAR
     */
    @OnEvent(INCIDENT_EVENTS.CLOSED)
    async handleIncidentClosed(payload: IncidentEventPayload): Promise<void> {
        this.logger.log(`Incident closed: ${payload.incidentId} - AAR can be created`);

        // 可以在這裡觸發通知，提示指揮官建立 AAR
        this.eventEmitter.emit('notifications.sent', {
            type: 'aar_reminder',
            incidentId: payload.incidentId,
            message: `事件 ${payload.title || payload.incidentId} 已結束，請建立事後復盤報告 (AAR)`,
        });
    }

    /**
     * 當 AAR 發布時
     */
    @OnEvent(ANALYTICS_EVENTS.AAR_PUBLISHED)
    async handleAARPublished(payload: AARPublishedPayload): Promise<void> {
        this.logger.log(`AAR published: ${payload.aarId} for Incident ${payload.incidentId}`);

        // 記錄到審計日誌
        this.eventEmitter.emit('audit.logged', {
            action: 'create',
            resourceType: 'AAR',
            resourceId: payload.aarId,
            userId: payload.userId,
            description: `AAR published: ${payload.title}`,
            metadata: {
                incidentId: payload.incidentId,
                aiGenerated: payload.aiGenerated,
            },
        });
    }

    /**
     * 當報表作業完成時
     */
    @OnEvent(ANALYTICS_EVENTS.REPORT_JOB_COMPLETED)
    async handleReportJobCompleted(payload: ReportJobCompletedPayload): Promise<void> {
        this.logger.log(`Report job completed: ${payload.jobId} (${payload.reportType})`);

        // 發送通知給請求者
        if (payload.userId) {
            this.eventEmitter.emit('notifications.sent', {
                type: 'report_ready',
                userId: payload.userId,
                message: `您的報表已產生完成`,
                data: {
                    jobId: payload.jobId,
                    outputUrl: payload.outputUrl,
                },
            });
        }
    }

    /**
     * 當 AI 摘要生成完成時
     */
    @OnEvent(ANALYTICS_EVENTS.AI_SUMMARY_GENERATED)
    async handleAISummaryGenerated(payload: AISummaryGeneratedPayload): Promise<void> {
        this.logger.log(`AI Summary generated: ${payload.summaryId}`);

        // 可以將 AI 摘要附加到 Incident 時間線
        if (payload.incidentId) {
            this.eventEmitter.emit(INCIDENT_EVENTS.UPDATED, {
                incidentId: payload.incidentId,
                metadata: {
                    aiSummaryId: payload.summaryId,
                    lastAISummary: new Date().toISOString(),
                },
            });
        }
    }
}
