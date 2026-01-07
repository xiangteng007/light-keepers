/**
 * AI Core Module - 智慧引擎
 * 
 * 整合模組: ai-queue, ai-prediction, ai-vision, image-recognition,
 *           aerial-image-analysis, emotion-analysis, event-ai,
 *           auto-summary, chatbot-assistant, rag-knowledge,
 *           disaster-summary, fatigue-detection, document-ocr, translation
 * 
 * 職責:
 * - AI 推論服務
 * - 電腦視覺 (影像辨識)
 * - NLP (摘要、翻譯)
 * - 預測模型
 */

import { Module } from '@nestjs/common';

@Module({
    imports: [
        // AI 模組通常是懶載入，避免增加啟動時間
        // 未來整合: AiPredictionModule, AiVisionModule, etc.
    ],
    exports: [],
})
export class AiCoreModule { }
