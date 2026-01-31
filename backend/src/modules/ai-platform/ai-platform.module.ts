import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core Services
import { AiOrchestratorService } from './core/ai-orchestrator.service';
import { GeminiClientService } from './core/gemini-client.service';
import { ModelRouterService } from './core/model-router.service';
import { TokenBudgetService } from './core/token-budget.service';

// Agents
import { ScoutAgent } from './agents/scout.agent';
import { IntelAgent } from './agents/intel.agent';
import { DispatcherAgent } from './agents/dispatcher.agent';
import { ForecasterAgent } from './agents/forecaster.agent';

// Capabilities
import { VisionCapability } from './capabilities/vision.capability';
import { SpeechCapability } from './capabilities/speech.capability';
import { ReasoningCapability } from './capabilities/reasoning.capability';

// Gateway
import { HumanInTheLoopGateway } from './gateway/human-in-the-loop.gateway';

/**
 * AI Platform 統一模組
 * 
 * 整合所有 AI 相關功能至單一平台架構：
 * - Core: 底層 AI 服務（Gemini 客戶端、模型路由、Token 管理）
 * - Agents: 自主運作代理（Scout, Intel, Dispatcher, Forecaster）
 * - Capabilities: 可組合能力（Vision, Speech, Reasoning）
 * - Gateway: 人機協作閘道
 */
@Global()
@Module({
    imports: [
        ConfigModule,
        EventEmitterModule.forRoot(),
    ],
    providers: [
        // Core Services
        AiOrchestratorService,
        GeminiClientService,
        ModelRouterService,
        TokenBudgetService,
        
        // Agents
        ScoutAgent,
        IntelAgent,
        DispatcherAgent,
        ForecasterAgent,
        
        // Capabilities
        VisionCapability,
        SpeechCapability,
        ReasoningCapability,
        
        // Gateway
        HumanInTheLoopGateway,
    ],
    exports: [
        // Export core services for other modules
        AiOrchestratorService,
        GeminiClientService,
        TokenBudgetService,
        
        // Export agents for direct usage
        ScoutAgent,
        IntelAgent,
        DispatcherAgent,
        ForecasterAgent,
        
        // Export capabilities
        VisionCapability,
        SpeechCapability,
        ReasoningCapability,
        
        // Export gateway
        HumanInTheLoopGateway,
    ],
})
export class AiPlatformModule {}
