import { Module } from '@nestjs/common';
import { ChatbotAssistantService } from './chatbot-assistant.service';

@Module({
    providers: [ChatbotAssistantService],
    exports: [ChatbotAssistantService],
})
export class ChatbotAssistantModule { }
