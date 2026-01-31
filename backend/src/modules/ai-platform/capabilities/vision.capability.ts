import { Injectable, Logger } from '@nestjs/common';
import { GeminiClientService } from '../core/gemini-client.service';

export interface VisionAnalysisResult {
    labels: string[];
    disasterType?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    objects: Array<{ name: string; confidence: number }>;
    text?: string;
    description: string;
}

/**
 * Vision Capability - 圖像分析能力
 * 
 * 提供：
 * - 災情影像分析
 * - 物件偵測
 * - OCR 文字提取
 * - 損壞程度評估
 */
@Injectable()
export class VisionCapability {
    private readonly logger = new Logger(VisionCapability.name);

    constructor(private readonly geminiClient: GeminiClientService) {}

    /**
     * 分析災情影像
     */
    async analyzeDisasterImage(
        imageBase64: string,
        mimeType: string = 'image/jpeg'
    ): Promise<VisionAnalysisResult> {
        const prompt = `
分析這張災害現場影像，提供以下資訊：
1. 影像中可見的物件和場景
2. 災害類型（地震、水災、火災、土石流等）
3. 損壞嚴重程度（low/medium/high/critical）
4. 任何可見的文字
5. 場景描述

請以 JSON 格式回覆：
{
  "labels": ["<標籤1>", "<標籤2>", ...],
  "disasterType": "<災害類型>",
  "severity": "low/medium/high/critical",
  "objects": [{"name": "<物件>", "confidence": 0.9}, ...],
  "text": "<偵測到的文字>",
  "description": "<場景描述>"
}
`;

        try {
            const response = await this.geminiClient.analyzeImage(
                imageBase64,
                mimeType,
                prompt
            );

            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                labels: [],
                objects: [],
                description: response.text,
            };
        } catch (error) {
            this.logger.error(`Vision analysis failed: ${error}`);
            throw error;
        }
    }

    /**
     * 比對兩張影像（用於協尋）
     */
    async compareFaces(
        image1Base64: string,
        image2Base64: string,
        mimeType: string = 'image/jpeg'
    ): Promise<{ similarity: number; match: boolean; reasoning: string }> {
        // Note: Gemini 1.5 支援多圖片輸入，但這裡簡化為單圖請求
        const prompt = `
這是一張人像照片。請描述這個人的外觀特徵，包括：
- 性別
- 估計年齡
- 髮型和髮色
- 臉型
- 明顯特徵

以 JSON 格式回覆：
{
  "gender": "<男/女>",
  "ageRange": "<年齡範圍>",
  "hair": "<髮型描述>",
  "faceShape": "<臉型>",
  "features": ["<特徵1>", "..."]
}
`;

        try {
            const response = await this.geminiClient.analyzeImage(
                image1Base64,
                mimeType,
                prompt
            );

            // 簡化處理：回傳特徵描述
            return {
                similarity: 0.5,
                match: false,
                reasoning: response.text,
            };
        } catch (error) {
            this.logger.error(`Face comparison failed: ${error}`);
            throw error;
        }
    }

    /**
     * OCR 文字提取
     */
    async extractText(
        imageBase64: string,
        mimeType: string = 'image/jpeg'
    ): Promise<{ text: string; language: string; confidence: number }> {
        const prompt = `
提取這張影像中的所有文字內容。

請以 JSON 格式回覆：
{
  "text": "<提取的文字>",
  "language": "<語言>",
  "confidence": <0.0-1.0>
}
`;

        try {
            const response = await this.geminiClient.analyzeImage(
                imageBase64,
                mimeType,
                prompt
            );

            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                text: response.text,
                language: 'unknown',
                confidence: 0.5,
            };
        } catch (error) {
            this.logger.error(`OCR failed: ${error}`);
            throw error;
        }
    }
}
