/**
 * Embedding provider —— 走既有 `LLM_BASE_URL` 的 OpenAI 相容 `/embeddings`。
 *
 * 刻意沿用同一個 base URL（已指向工作站 Ollama），不新增任何對外連線，
 * 符合零雲端要求。embed 模型與 chat 模型分開設定：
 *   LLM_MODEL    chat（現為 qwen3:14b）
 *   EMBED_MODEL  embedding（預設 bge-m3，1024 維）
 *
 * VRAM：qwen3:14b 實測 9.3 GB + bge-m3 約 0.7 GB，於 16 GB 卡可同時常駐，
 * 不會觸發 D22 要避免的模型交替載入抖動。
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegulationEmbeddingService {
    private readonly logger = new Logger(RegulationEmbeddingService.name);
    private readonly baseUrl: string;
    private readonly model: string;
    private readonly timeoutMs: number;
    private readonly provider: string;
    private warned = false;

    constructor(private readonly config: ConfigService) {
        this.baseUrl = (this.config.get<string>('LLM_BASE_URL') || '').replace(/\/+$/, '');
        this.model = this.config.get<string>('EMBED_MODEL') || 'bge-m3';
        this.timeoutMs = Number(this.config.get('EMBED_TIMEOUT_MS') ?? 20000);
        this.provider = (this.config.get<string>('LLM_PROVIDER') || 'local').toLowerCase();
    }

    isConfigured(): boolean {
        return !!this.baseUrl && this.provider !== 'gemini';
    }

    /**
     * 產生查詢向量。任何失敗都回 null（呼叫端降級為關鍵字比對並明示），
     * 絕不拋例外中斷問答流程。
     *
     * LLM_PROVIDER=gemini 時明確拒絕而非偷偷走雲端 —— 法規語料雖是公開資料，
     * 但使用者的查詢字串可能含敏感情境（傷患、部署、動員），不應離開本地。
     */
    async embed(text: string): Promise<number[] | null> {
        if (!this.isConfigured()) {
            if (!this.warned) {
                this.logger.warn(
                    this.provider === 'gemini'
                        ? 'LLM_PROVIDER=gemini —— 法規 embedding 拒絕走雲端，檢索降級為關鍵字比對'
                        : 'LLM_BASE_URL 未設定，法規檢索降級為關鍵字比對',
                );
                this.warned = true;
            }
            return null;
        }

        try {
            const res = await fetch(`${this.baseUrl}/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: this.model, input: text }),
                signal: AbortSignal.timeout(this.timeoutMs),
            });
            if (!res.ok) {
                this.logger.warn(`embedding HTTP ${res.status}`);
                return null;
            }
            const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
            const vec = json.data?.[0]?.embedding;
            return Array.isArray(vec) && vec.length > 0 ? vec : null;
        } catch (e) {
            this.logger.warn(`embedding 失敗（降級為關鍵字比對）：${e}`);
            return null;
        }
    }
}
