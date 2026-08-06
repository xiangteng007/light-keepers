import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmModule } from '../ai-queue/providers/llm.module';
import { RegulationRagController } from './regulation-rag.controller';
import { RegulationQaService } from './regulation-qa.service';
import { RegulationCorpusService } from './regulation-corpus.service';
import { RegulationEmbeddingService } from './regulation-embedding.service';

/**
 * 台灣災防／戰時動員法規 RAG。
 *
 * 刻意與 `ManualsModule` 完全分離 —— manuals 的行為零改動，
 * 本模組可獨立上線與獨立回滾（從 AppModule imports 移除即可）。
 */
@Module({
    imports: [ConfigModule, LlmModule],
    controllers: [RegulationRagController],
    providers: [RegulationEmbeddingService, RegulationCorpusService, RegulationQaService],
    exports: [RegulationQaService, RegulationCorpusService],
})
export class RegulationRagModule {}
