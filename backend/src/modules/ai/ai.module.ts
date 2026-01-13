/**
 * AI Module - 統一 AI 服務整合中心
 * 
 * Unified facade for all AI-powered services:
 * 1. DispatcherAgentService - 智慧派遣官
 * 2. ForecasterAgentService - 物資預判官
 * 3. ChatbotAssistantModule - AI 助手 (Gemini)
 * 
 * v2.0 - Facade Pattern
 */

import { Module, forwardRef } from '@nestjs/common';
import { AIController } from './ai.controller';
import { DispatcherAgentService } from './services/dispatcher-agent.service';
import { ForecasterAgentService } from './services/forecaster-agent.service';
import { ChatbotAssistantModule } from '../chatbot-assistant/chatbot-assistant.module';

@Module({
    imports: [
        forwardRef(() => ChatbotAssistantModule),
    ],
    controllers: [AIController],
    providers: [DispatcherAgentService, ForecasterAgentService],
    exports: [DispatcherAgentService, ForecasterAgentService],
})
export class AIModule { }

