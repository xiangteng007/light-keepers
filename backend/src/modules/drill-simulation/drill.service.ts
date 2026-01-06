/**
 * 演練模擬服務 (Drill Simulation Service)
 * 模組 A: 數位孿生演練系統
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrillScenario, DrillStatus, DrillEvent, DrillResult } from './entities/drill-scenario.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DrillGlobalState {
    isDrillMode: boolean;
    activeScenarioId: string | null;
    startTime: Date | null;
    currentEventIndex: number;
}

@Injectable()
export class DrillSimulationService {
    private readonly logger = new Logger(DrillSimulationService.name);

    // 全域演練狀態
    private globalState: DrillGlobalState = {
        isDrillMode: false,
        activeScenarioId: null,
        startTime: null,
        currentEventIndex: 0,
    };

    // 演練期間的事件計時器
    private eventTimers: NodeJS.Timeout[] = [];

    // 演練期間的統計數據
    private drillStats = {
        totalEvents: 0,
        respondedEvents: 0,
        responseTimes: [] as number[],
    };

    constructor(
        @InjectRepository(DrillScenario)
        private scenarioRepository: Repository<DrillScenario>,
        private eventEmitter: EventEmitter2,
    ) { }

    // ==================== 全域狀態管理 ====================

    /**
     * 取得全域演練狀態
     */
    getGlobalState(): DrillGlobalState {
        return { ...this.globalState };
    }

    /**
     * 檢查是否在演練模式
     */
    isDrillMode(): boolean {
        return this.globalState.isDrillMode;
    }

    // ==================== 腳本管理 ====================

    /**
     * 建立演練腳本
     */
    async createScenario(data: {
        title: string;
        description?: string;
        events: DrillEvent[];
        createdBy: string;
    }): Promise<DrillScenario> {
        const scenario = this.scenarioRepository.create({
            ...data,
            status: DrillStatus.DRAFT,
        });
        return this.scenarioRepository.save(scenario);
    }

    /**
     * 更新演練腳本
     */
    async updateScenario(id: string, updates: Partial<DrillScenario>): Promise<DrillScenario> {
        await this.scenarioRepository.update(id, updates);
        return this.scenarioRepository.findOneOrFail({ where: { id } });
    }

    /**
     * 取得所有腳本
     */
    async getAllScenarios(): Promise<DrillScenario[]> {
        return this.scenarioRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 取得腳本詳情
     */
    async getScenario(id: string): Promise<DrillScenario | null> {
        return this.scenarioRepository.findOne({ where: { id } });
    }

    // ==================== 演練執行 ====================

    /**
     * 啟動演練
     */
    async startDrill(scenarioId: string): Promise<{ success: boolean; message: string }> {
        if (this.globalState.isDrillMode) {
            return { success: false, message: '已有演練正在進行中' };
        }

        const scenario = await this.scenarioRepository.findOne({ where: { id: scenarioId } });
        if (!scenario) {
            return { success: false, message: '找不到演練腳本' };
        }

        // 設定全域狀態
        this.globalState = {
            isDrillMode: true,
            activeScenarioId: scenarioId,
            startTime: new Date(),
            currentEventIndex: 0,
        };

        // 重置統計
        this.drillStats = {
            totalEvents: scenario.events.length,
            respondedEvents: 0,
            responseTimes: [],
        };

        // 更新腳本狀態
        await this.scenarioRepository.update(scenarioId, {
            status: DrillStatus.RUNNING,
            startedAt: new Date(),
        });

        // 排程事件
        this.scheduleEvents(scenario.events);

        // 發送全域事件
        this.eventEmitter.emit('drill.started', {
            scenarioId,
            title: scenario.title,
            totalEvents: scenario.events.length,
        });

        this.logger.log(`Drill started: ${scenario.title} (${scenarioId})`);

        return { success: true, message: `演練「${scenario.title}」已開始` };
    }

    /**
     * 停止演練
     */
    async stopDrill(): Promise<{ success: boolean; result?: DrillResult }> {
        if (!this.globalState.isDrillMode) {
            return { success: false };
        }

        // 清除所有計時器
        this.eventTimers.forEach(timer => clearTimeout(timer));
        this.eventTimers = [];

        // 計算結果
        const result = this.calculateResult();

        // 更新腳本
        if (this.globalState.activeScenarioId) {
            await this.scenarioRepository.update(this.globalState.activeScenarioId, {
                status: DrillStatus.COMPLETED,
                endedAt: new Date(),
                result,
            });
        }

        // 發送事件
        this.eventEmitter.emit('drill.stopped', { result });

        // 重置狀態
        this.globalState = {
            isDrillMode: false,
            activeScenarioId: null,
            startTime: null,
            currentEventIndex: 0,
        };

        this.logger.log('Drill stopped');

        return { success: true, result };
    }

    /**
     * 記錄事件回應
     */
    recordEventResponse(eventIndex: number, responseTimeMs: number): void {
        this.drillStats.respondedEvents++;
        this.drillStats.responseTimes.push(responseTimeMs);

        this.eventEmitter.emit('drill.event.responded', {
            eventIndex,
            responseTimeMs,
        });
    }

    // ==================== 事件注入 ====================

    private scheduleEvents(events: DrillEvent[]): void {
        const startTime = Date.now();

        events.forEach((event, index) => {
            const delayMs = event.offsetMinutes * 60 * 1000;

            const timer = setTimeout(() => {
                this.triggerEvent(event, index);
            }, delayMs);

            this.eventTimers.push(timer);
        });

        this.logger.log(`Scheduled ${events.length} drill events`);
    }

    private async triggerEvent(event: DrillEvent, index: number): Promise<void> {
        this.globalState.currentEventIndex = index;

        this.logger.log(`Triggering drill event: ${event.type} at T+${event.offsetMinutes}`);

        // 根據事件類型發送不同的模擬事件
        switch (event.type) {
            case 'SOS':
                await this.injectSOSEvent(event);
                break;
            case 'REPORT':
                await this.injectReportEvent(event);
                break;
            case 'RESOURCE_REQUEST':
                await this.injectResourceRequest(event);
                break;
            case 'COMMUNICATION_FAILURE':
                await this.injectCommunicationFailure(event);
                break;
            case 'EVACUATION':
                await this.injectEvacuationEvent(event);
                break;
            default:
                this.eventEmitter.emit('drill.event.custom', { event, index });
        }

        this.eventEmitter.emit('drill.event.triggered', { event, index });
    }

    private async injectSOSEvent(event: DrillEvent): Promise<void> {
        this.eventEmitter.emit('drill.sos.inject', {
            location: event.location,
            message: event.description,
            payload: event.payload,
            isDrill: true,
        });
    }

    private async injectReportEvent(event: DrillEvent): Promise<void> {
        this.eventEmitter.emit('drill.report.inject', {
            location: event.location,
            type: event.payload?.reportType || 'incident',
            severity: event.payload?.severity || 'medium',
            description: event.description,
            isDrill: true,
        });
    }

    private async injectResourceRequest(event: DrillEvent): Promise<void> {
        this.eventEmitter.emit('drill.resource.inject', {
            resourceType: event.payload?.resourceType,
            quantity: event.payload?.quantity,
            location: event.location,
            urgency: event.payload?.urgency || 'normal',
            isDrill: true,
        });
    }

    private async injectCommunicationFailure(event: DrillEvent): Promise<void> {
        this.eventEmitter.emit('drill.comm.failure', {
            affectedAreas: event.payload?.areas || [],
            duration: event.payload?.duration || 30,
            isDrill: true,
        });
    }

    private async injectEvacuationEvent(event: DrillEvent): Promise<void> {
        this.eventEmitter.emit('drill.evacuation.inject', {
            zone: event.payload?.zone,
            shelters: event.payload?.shelters || [],
            population: event.payload?.population || 0,
            isDrill: true,
        });
    }

    // ==================== 結果計算 ====================

    private calculateResult(): DrillResult {
        const avgResponseTime = this.drillStats.responseTimes.length > 0
            ? this.drillStats.responseTimes.reduce((a, b) => a + b, 0) / this.drillStats.responseTimes.length
            : 0;

        const responseRate = this.drillStats.totalEvents > 0
            ? (this.drillStats.respondedEvents / this.drillStats.totalEvents) * 100
            : 0;

        // 計算各項分數
        const resourceScore = Math.min(100, responseRate + 10);
        const communicationScore = avgResponseTime < 300000 ? 85 : avgResponseTime < 600000 ? 70 : 50;
        const decisionScore = responseRate > 80 ? 90 : responseRate > 60 ? 75 : 60;

        // 生成 AI 建議
        const recommendations = this.generateRecommendations(avgResponseTime, responseRate);

        return {
            totalEvents: this.drillStats.totalEvents,
            respondedEvents: this.drillStats.respondedEvents,
            averageResponseTime: Math.round(avgResponseTime / 1000), // 轉為秒
            resourceAllocationScore: Math.round(resourceScore),
            communicationScore: Math.round(communicationScore),
            decisionQualityScore: Math.round(decisionScore),
            aiRecommendations: recommendations,
        };
    }

    private generateRecommendations(avgResponseTime: number, responseRate: number): string[] {
        const recommendations: string[] = [];

        if (avgResponseTime > 600000) {
            recommendations.push('建議加強緊急通報流程培訓，目標將平均回應時間縮短至 5 分鐘內');
        }

        if (responseRate < 80) {
            recommendations.push('部分事件未獲回應，建議增設備援人員或改善值班制度');
        }

        if (responseRate < 60) {
            recommendations.push('⚠️ 回應率偏低，建議檢討人力配置與通訊設備狀態');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ 演練表現良好，建議定期維持演練頻率');
        }

        recommendations.push('建議於下次演練前進行事前簡報，確保所有人員熟悉操作流程');

        return recommendations;
    }
}
