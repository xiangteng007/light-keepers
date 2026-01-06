import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RagKnowledgeService } from './rag-knowledge.service';

@ApiTags('RAG Knowledge 知識庫')
@Controller('api/knowledge')
export class RagKnowledgeController {
    constructor(private readonly ragService: RagKnowledgeService) { }

    @Post('query')
    @ApiOperation({ summary: 'RAG 問答', description: '使用 AI 回答災防相關問題' })
    async query(@Body() body: { question: string; topK?: number }): Promise<any> {
        return this.ragService.query(body.question, { topK: body.topK });
    }

    @Get('search')
    @ApiOperation({ summary: '搜尋文件', description: '搜尋知識庫文件' })
    search(@Query('q') q: string, @Query('category') category?: string): any {
        return this.ragService.search(q, category);
    }

    @Get('categories')
    @ApiOperation({ summary: '取得分類', description: '取得知識庫文件分類' })
    getCategories(): any {
        return this.ragService.getCategories();
    }

    @Post('documents')
    @ApiOperation({ summary: '新增文件', description: '新增知識庫文件' })
    addDocument(@Body() body: { title: string; category: string; content: string }): any {
        return this.ragService.addDocument(body);
    }
}
