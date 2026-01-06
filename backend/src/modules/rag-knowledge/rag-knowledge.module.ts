import { Module } from '@nestjs/common';
import { RagKnowledgeService } from './rag-knowledge.service';
import { RagKnowledgeController } from './rag-knowledge.controller';

@Module({
    controllers: [RagKnowledgeController],
    providers: [RagKnowledgeService],
    exports: [RagKnowledgeService],
})
export class RagKnowledgeModule { }
