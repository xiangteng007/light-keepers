import { Module } from '@nestjs/common';
import { ManualsController } from './manuals.controller';
import { ManualsService } from './manuals.service';
import { LlmModule } from '../ai-queue/providers/llm.module';

@Module({
    imports: [LlmModule],
    controllers: [ManualsController],
    providers: [ManualsService],
    exports: [ManualsService],
})
export class ManualsModule { }
