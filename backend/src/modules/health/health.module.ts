import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { LlmModule } from '../ai-queue/providers/llm.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([]), // Empty - just need DataSource access
        LlmModule, // exposes LLM availability on GET /health/llm
    ],
    controllers: [HealthController],
})
export class HealthModule { }

