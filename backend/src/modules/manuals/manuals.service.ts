import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 手冊資料 - 與前端同步
const MANUALS_DATA = [
    {
        id: 'eq-1',
        categoryId: 'earthquake',
        categoryName: '地震',
        title: '地震發生時的「趴下、掩護、穩住」',
        summary: '地震來臨時的基本自保動作',
        content: '地震發生時，正確的應變動作可以大幅降低受傷風險。記住三個關鍵動作：趴下(DROP)、掩護(COVER)、穩住(HOLD ON)。立即趴下，雙手雙膝著地，降低重心避免被搖晃摔倒。移動到堅固的桌子下方，用手臂保護頭部和頸部。緊握桌腳，準備隨著桌子移動，保持姿勢直到搖晃停止。',
        tags: ['基礎', '室內'],
    },
    {
        id: 'eq-2',
        categoryId: 'earthquake',
        categoryName: '地震',
        title: '地震後的安全確認步驟',
        summary: '震後應立即確認的安全事項',
        content: '地震停止後，不要急著離開，先進行安全確認。檢查自己是否受傷，觀察是否有建築結構損壞、瓦斯外洩的氣味、電線走火等危險。關閉瓦斯總開關以防止火災。穿上堅固的鞋子再移動，使用手電筒而非蠟燭。',
        tags: ['震後', '安全確認'],
    },
    {
        id: 'fa-1',
        categoryId: 'firstaid',
        categoryName: '急救',
        title: 'CPR 心肺復甦術操作步驟',
        summary: '成人急救 CPR 的完整流程',
        content: '心肺復甦術(CPR)是在心臟停止跳動時維持血液循環的緊急措施。步驟：確認環境安全、檢查意識（輕拍肩膀大聲呼喚）、呼叫求救撥打119、胸部按壓（雙手交疊置於兩乳頭連線中點，手臂打直垂直向下按壓5-6公分，速率每分鐘100-120下）、人工呼吸（壓額抬下巴，捏住鼻子，嘴對嘴吹氣）。',
        tags: ['CPR', '急救'],
    },
    {
        id: 'fa-2',
        categoryId: 'firstaid',
        categoryName: '急救',
        title: 'AED 自動體外心臟電擊器使用指南',
        summary: '如何正確使用 AED 進行急救',
        content: 'AED（自動體外心臟電擊器）是為心室顫動患者提供電擊除顫的緊急設備。步驟：開啟電源、貼上電極片（右鎖骨下方和左側腋下）、等待AED分析心律、如需電擊則確認無人接觸後按下電擊按鈕、電擊後立即繼續CPR。',
        tags: ['AED', '心臟'],
    },
    {
        id: 'sh-1',
        categoryId: 'shelter',
        categoryName: '避難',
        title: '緊急避難包準備清單',
        summary: '避難包應包含的基本物資',
        content: '緊急避難包應包含：飲水（每人每日3公升，3天份）、不需烹煮的食物（餅乾、能量棒）、重要文件影本（身分證、健保卡、存摺）、醫療用品（個人藥物、急救包、口罩）、照明通訊（手電筒、備用電池、行動電源、收音機）、保暖衣物、現金、哨子、瑞士刀、衛生紙。',
        tags: ['避難包', '準備'],
    },
    {
        id: 'fr-1',
        categoryId: 'fire',
        categoryName: '火災',
        title: '火災逃生的基本原則',
        summary: '遭遇火災時的逃生要點',
        content: '火災逃生原則：保持冷靜、低姿勢前進避免吸入濃煙、用濕毛巾掩住口鼻、沿著牆壁摸索前進、不可搭乘電梯、到達安全地點後清點人數並撥打119。若門把燙手表示門外有火，不可開門。',
        tags: ['逃生', '基礎'],
    },
    {
        id: 'ty-1',
        categoryId: 'typhoon',
        categoryName: '颱風',
        title: '颱風來臨前的防災準備清單',
        summary: '颱風警報發布後應準備的物資與措施',
        content: '颱風準備：儲存飲用水和食物、準備手電筒和電池、固定或收好陽台物品、檢查門窗是否牢固、準備急救藥品、確認避難路線、保持手機充滿電、關注氣象資訊。',
        tags: ['準備', '物資'],
    },
    {
        id: 'fl-1',
        categoryId: 'flood',
        categoryName: '水災',
        title: '淹水時的緊急應變措施',
        summary: '住家開始淹水時的處理步驟',
        content: '淹水應變：關閉電源總開關、將重要物品移至高處、準備逃生物資、不要涉水行走（可能有電或暗流）、如需撤離往高處移動、遠離河川溝渠。',
        tags: ['緊急', '應變'],
    },
];

export interface SearchResult {
    manual: typeof MANUALS_DATA[0];
    relevanceScore: number;
    aiSummary?: string;
}

export interface AiSearchResponse {
    query: string;
    results: SearchResult[];
    aiAnswer?: string;
    processingTime: number;
}

@Injectable()
export class ManualsService {
    private readonly logger = new Logger(ManualsService.name);
    private genAI: GoogleGenerativeAI | null = null;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.logger.log('Gemini AI initialized successfully');
        } else {
            this.logger.warn('GEMINI_API_KEY not found, AI search will be disabled');
        }
    }

    // 取得所有手冊
    getAllManuals() {
        return MANUALS_DATA;
    }

    // 取得單一手冊
    getManualById(id: string) {
        return MANUALS_DATA.find(m => m.id === id);
    }

    // AI 語意搜尋
    async searchWithAI(query: string): Promise<AiSearchResponse> {
        const startTime = Date.now();

        if (!this.genAI) {
            // 如果沒有 API Key，使用簡單的關鍵字搜尋
            return this.fallbackSearch(query, startTime);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            // 準備手冊摘要給 AI
            const manualsSummary = MANUALS_DATA.map(m =>
                `[${m.id}] ${m.categoryName} - ${m.title}: ${m.summary}`
            ).join('\n');

            const prompt = `你是一個災難應變專家助手。用戶詢問：「${query}」

以下是可用的災難應變手冊：
${manualsSummary}

請執行以下任務：
1. 找出與用戶問題最相關的手冊（最多3個）
2. 給出簡短的回答（50字以內）

請用 JSON 格式回覆：
{
  "relevantManualIds": ["id1", "id2"],
  "answer": "簡短回答"
}`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // 解析 AI 回應
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const relevantIds: string[] = parsed.relevantManualIds || [];
                const aiAnswer = parsed.answer || '';

                const results: SearchResult[] = relevantIds
                    .map((id, index) => {
                        const manual = MANUALS_DATA.find(m => m.id === id);
                        if (!manual) return null;
                        return {
                            manual,
                            relevanceScore: 1 - (index * 0.2), // 排名越前分數越高
                        };
                    })
                    .filter((r): r is SearchResult => r !== null);

                return {
                    query,
                    results,
                    aiAnswer,
                    processingTime: Date.now() - startTime,
                };
            }

            // JSON 解析失敗，使用備用搜尋
            return this.fallbackSearch(query, startTime);
        } catch (error) {
            this.logger.error(`Gemini AI search error: ${error}`);
            return this.fallbackSearch(query, startTime);
        }
    }

    // 備用簡單搜尋
    private fallbackSearch(query: string, startTime: number): AiSearchResponse {
        const lowerQuery = query.toLowerCase();
        const results: SearchResult[] = MANUALS_DATA
            .filter(m =>
                m.title.toLowerCase().includes(lowerQuery) ||
                m.summary.toLowerCase().includes(lowerQuery) ||
                m.content.toLowerCase().includes(lowerQuery) ||
                m.categoryName.includes(query) ||
                m.tags.some(t => t.includes(query))
            )
            .slice(0, 5)
            .map((manual, index) => ({
                manual,
                relevanceScore: 1 - (index * 0.15),
            }));

        return {
            query,
            results,
            processingTime: Date.now() - startTime,
        };
    }
}
