import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AiOrchestratorService, AiDecision } from '../core/ai-orchestrator.service';

/**
 * Human-in-the-Loop Gateway
 * 
 * WebSocket 閘道用於：
 * - 即時推送待確認的 AI 決策
 * - 接收人工確認/拒絕
 * - 廣播決策結果
 */
@WebSocketGateway({
    namespace: '/ai-decisions',
    cors: { origin: '*' },
})
export class HumanInTheLoopGateway {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(HumanInTheLoopGateway.name);

    constructor(private readonly orchestrator: AiOrchestratorService) {}

    /**
     * 客戶端連線
     */
    handleConnection(client: Socket): void {
        this.logger.log(`Client connected: ${client.id}`);
        
        // 發送目前待確認的決策
        const pending = this.orchestrator.getPendingDecisions();
        client.emit('pending-decisions', pending);
    }

    /**
     * 客戶端斷線
     */
    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * 接收決策確認
     */
    @SubscribeMessage('approve-decision')
    async handleApprove(
        @MessageBody() data: { decisionId: string },
        @ConnectedSocket() client: Socket
    ): Promise<void> {
        try {
            await this.orchestrator.approveDecision(data.decisionId, true);
            
            // 廣播決策已核准
            this.server.emit('decision-approved', {
                decisionId: data.decisionId,
                approvedBy: client.id,
                timestamp: new Date(),
            });
            
            this.logger.log(`Decision approved: ${data.decisionId}`);
        } catch (error) {
            client.emit('error', { message: error.message });
        }
    }

    /**
     * 接收決策拒絕
     */
    @SubscribeMessage('reject-decision')
    async handleReject(
        @MessageBody() data: { decisionId: string; reason?: string },
        @ConnectedSocket() client: Socket
    ): Promise<void> {
        try {
            await this.orchestrator.approveDecision(data.decisionId, false);
            
            // 廣播決策已拒絕
            this.server.emit('decision-rejected', {
                decisionId: data.decisionId,
                rejectedBy: client.id,
                reason: data.reason,
                timestamp: new Date(),
            });
            
            this.logger.log(`Decision rejected: ${data.decisionId}`);
        } catch (error) {
            client.emit('error', { message: error.message });
        }
    }

    /**
     * 查詢待確認決策
     */
    @SubscribeMessage('get-pending')
    handleGetPending(@ConnectedSocket() client: Socket): void {
        const pending = this.orchestrator.getPendingDecisions();
        client.emit('pending-decisions', pending);
    }

    /**
     * 查詢預算狀態
     */
    @SubscribeMessage('get-budget')
    handleGetBudget(@ConnectedSocket() client: Socket): void {
        const budget = this.orchestrator.getBudgetStatus();
        client.emit('budget-status', budget);
    }

    /**
     * 推送新的待確認決策（供其他服務調用）
     */
    broadcastNewDecision(decision: AiDecision): void {
        this.server.emit('new-decision', decision);
    }

    /**
     * 推送預算警告
     */
    broadcastBudgetWarning(warning: any): void {
        this.server.emit('budget-warning', warning);
    }
}
