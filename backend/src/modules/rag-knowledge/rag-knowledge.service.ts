import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * RAG Knowledge Base Service
 * Disaster prevention regulations and SOP Q&A with Retrieval-Augmented Generation
 * 
 * 📋 需要設定:
 * - GEMINI_API_KEY: Google AI API Key
 */
@Injectable()
export class RagKnowledgeService {
    private readonly logger = new Logger(RagKnowledgeService.name);
    private documents: KnowledgeDocument[] = [];
    private embeddings: Map<string, number[]> = new Map();

    constructor(private configService: ConfigService) {
        this.loadKnowledgeBase();
    }

    private loadKnowledgeBase() {
        // 預載災防知識庫
        this.documents = [
            { id: 'sop-001', title: '地震應變 SOP', category: 'sop', content: '地震發生時：1. 趴下、掩護、穩住 2. 主震過後確認安全 3. 檢查瓦斯電源...' },
            { id: 'sop-002', title: '颱風防災 SOP', category: 'sop', content: '颱風來襲前：1. 儲備糧食飲水 2. 檢查門窗 3. 準備手電筒...' },
            { id: 'law-001', title: '災害防救法', category: 'law', content: '第一條：為健全災害防救體制，強化災害防救功能...' },
            { id: 'law-002', title: '緊急醫療救護法', category: 'law', content: '第一條：為健全緊急醫療救護體系...' },
            { id: 'guide-001', title: '志工安全守則', category: 'guide', content: '志工執勤安全注意事項：1. 穿著完整防護裝備 2. 兩人一組...' },
            { id: 'guide-002', title: 'START 檢傷分類', category: 'guide', content: 'START 快速檢傷：1. 能走動？綠色 2. 呼吸？3. 脈搏？...' },
        ];

        this.logger.log(`Loaded ${this.documents.length} knowledge documents`);
    }

    /**
     * RAG 問答
     */
    async query(question: string, options?: QueryOptions): Promise<RagResponse> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        // 1. 檢索相關文件
        const relevantDocs = this.retrieveRelevant(question, options?.topK || 3);

        // 2. 建構提示詞
        const context = relevantDocs.map((d) => `【${d.title}】\n${d.content}`).join('\n\n');
        const prompt = `你是台灣災害防救專家。請根據以下資料回答問題。

=== 參考資料 ===
${context}

=== 問題 ===
${question}

=== 回答 ===`;

        // 3. 呼叫 LLM
        if (!apiKey) {
            return {
                answer: this.generateFallbackAnswer(question, relevantDocs),
                sources: relevantDocs.map((d) => ({ id: d.id, title: d.title })),
                confidence: 0.7,
            };
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                },
            );

            const data = await response.json();
            const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '無法生成回答';

            return {
                answer,
                sources: relevantDocs.map((d) => ({ id: d.id, title: d.title })),
                confidence: 0.9,
            };
        } catch (error) {
            this.logger.error('RAG query failed', error);
            return {
                answer: this.generateFallbackAnswer(question, relevantDocs),
                sources: relevantDocs.map((d) => ({ id: d.id, title: d.title })),
                confidence: 0.5,
            };
        }
    }

    /**
     * 檢索相關文件
     */
    retrieveRelevant(query: string, topK: number = 3): KnowledgeDocument[] {
        // 簡單關鍵字匹配 (TODO: 使用向量搜尋)
        const queryWords = query.toLowerCase().split(/\s+/);
        const scored = this.documents.map((doc) => {
            const text = `${doc.title} ${doc.content}`.toLowerCase();
            const score = queryWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
            return { doc, score };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((s) => s.doc);
    }

    /**
     * 新增知識文件
     */
    addDocument(doc: Omit<KnowledgeDocument, 'id'>): KnowledgeDocument {
        const newDoc: KnowledgeDocument = { id: `doc-${Date.now()}`, ...doc };
        this.documents.push(newDoc);
        return newDoc;
    }

    /**
     * 取得分類
     */
    getCategories(): { category: string; count: number }[] {
        const counts = this.documents.reduce((acc, d) => {
            acc[d.category] = (acc[d.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([category, count]) => ({ category, count }));
    }

    /**
     * 搜尋文件
     */
    search(query: string, category?: string): KnowledgeDocument[] {
        let docs = [...this.documents];
        if (category) docs = docs.filter((d) => d.category === category);
        return this.retrieveRelevant(query, 10).filter((d) => docs.includes(d));
    }

    private generateFallbackAnswer(question: string, docs: KnowledgeDocument[]): string {
        if (docs.length === 0) return '找不到相關資料，請諮詢專業人員。';
        return `根據「${docs[0].title}」: ${docs[0].content.substring(0, 200)}...`;
    }
}

// Types
interface KnowledgeDocument { id: string; title: string; category: string; content: string; }
interface QueryOptions { topK?: number; category?: string; }
interface RagResponse { answer: string; sources: { id: string; title: string }[]; confidence: number; }
