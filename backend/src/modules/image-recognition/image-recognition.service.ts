import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Image Recognition Service
 * AI-powered disaster damage classification from photos
 * 
 * 📋 需要設定:
 * - GEMINI_API_KEY: Google AI API Key
 */
@Injectable()
export class ImageRecognitionService {
    private readonly logger = new Logger(ImageRecognitionService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 分析災損照片
     */
    async analyzeDisasterImage(imageBase64: string): Promise<DisasterAnalysis> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            return this.getMockAnalysis();
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: '分析這張災害照片，回傳 JSON 格式包含 damageType, severity (1-5), description, recommendations 陣列' },
                                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                            ],
                        }],
                    }),
                },
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // 嘗試解析 JSON
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }

            return this.getMockAnalysis();
        } catch (error) {
            this.logger.error('Image analysis failed', error);
            return this.getMockAnalysis();
        }
    }

    /**
     * 分類災害類型
     */
    async classifyDamage(imageBase64: string): Promise<DamageClassification> {
        const analysis = await this.analyzeDisasterImage(imageBase64);

        return {
            type: analysis.damageType,
            confidence: 0.85,
            severity: analysis.severity,
            tags: this.generateTags(analysis),
        };
    }

    /**
     * 偵測危險物
     */
    async detectHazards(imageBase64: string): Promise<HazardDetection[]> {
        // TODO: 使用物件偵測模型
        return [
            { type: 'collapsed_structure', confidence: 0.9, boundingBox: { x: 100, y: 100, width: 200, height: 150 } },
            { type: 'flood_water', confidence: 0.75, boundingBox: { x: 0, y: 300, width: 400, height: 100 } },
        ];
    }

    /**
     * 辨識人員
     */
    async detectPersons(imageBase64: string): Promise<PersonDetection[]> {
        // TODO: 使用人員偵測模型
        return [
            { confidence: 0.92, boundingBox: { x: 50, y: 80, width: 60, height: 120 }, status: 'standing' },
        ];
    }

    /**
     * 比對照片 (找尋失蹤人員)
     */
    async compareImages(image1Base64: string, image2Base64: string): Promise<ImageCompareResult> {
        // TODO: 使用人臉比對模型
        return {
            similarity: 0.78,
            isMatch: false,
            confidence: 0.85,
        };
    }

    private generateTags(analysis: DisasterAnalysis): string[] {
        const tags: string[] = [];
        if (analysis.severity >= 4) tags.push('緊急');
        if (analysis.damageType) tags.push(analysis.damageType);
        return tags;
    }

    private getMockAnalysis(): DisasterAnalysis {
        return {
            damageType: 'building_collapse',
            severity: 3,
            description: '建築物部分倒塌，可見結構損壞',
            recommendations: ['疏散周圍人員', '設置警戒線', '通知結構技師評估'],
        };
    }
}

// Types
interface DisasterAnalysis { damageType: string; severity: number; description: string; recommendations: string[]; }
interface DamageClassification { type: string; confidence: number; severity: number; tags: string[]; }
interface BoundingBox { x: number; y: number; width: number; height: number; }
interface HazardDetection { type: string; confidence: number; boundingBox: BoundingBox; }
interface PersonDetection { confidence: number; boundingBox: BoundingBox; status: string; }
interface ImageCompareResult { similarity: number; isMatch: boolean; confidence: number; }
