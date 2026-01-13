import { Module } from '@nestjs/common';
import { ChatbotAssistantService } from './chatbot-assistant.service';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
    providers: [ChatbotAssistantService, GeminiProvider],
    exports: [ChatbotAssistantService, GeminiProvider],
})
export class ChatbotAssistantModule { }

