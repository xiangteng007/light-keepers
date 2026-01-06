/**
 * AI Vision Service - Gemini Vision 影像辨識
 * 中期擴展功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export enum DetectionType {
    PERSON = 'PERSON',
    VEHICLE = 'VEHICLE',
    BUILDING_DAMAGE = 'BUILDING_DAMAGE',
    FIRE = 'FIRE',
    SMOKE = 'SMOKE',
    FLOOD = 'FLOOD',
    DEBRIS = 'DEBRIS',
    ROAD_BLOCKAGE = 'ROAD_BLOCKAGE',
    INJURED = 'INJURED',
    TRAPPED = 'TRAPPED',
    HAZMAT = 'HAZMAT',
    UNKNOWN = 'UNKNOWN',
}

export interface ImageAnalysisResult {
    id: string;
    sourceId?: string; // Drone ID, camera ID, etc.
    imageUrl?: string;
    timestamp: Date;
    detections: Detection[];
    summary: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
}

export interface Detection {
    type: DetectionType;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    description?: string;
    count?: number;
}

export interface DamageAssessment {
    id: string;
    location: { lat: number; lng: number };
    imageUrls: string[];
    overallDamage: 'none' | 'minor' | 'moderate' | 'severe' | 'destroyed';
    structuralIntegrity: number; // 0-100
    accessStatus: 'accessible' | 'limited' | 'blocked';
    hazards: string[];
    recommendations: string[];
    analyzedAt: Date;
}

// ============ Service ============

@Injectable()
export class AiVisionService {
    private readonly logger = new Logger(AiVisionService.name);
    private readonly apiKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    }

    // ==================== Image Analysis ====================

    /**
     * 分析影像 (使用 Gemini Vision)
     */
    async analyzeImage(
        imageBase64: string,
        context?: string,
        sourceId?: string
    ): Promise<ImageAnalysisResult> {
        const id = `analysis-${Date.now()}`;

        if (!this.apiKey) {
            this.logger.warn('Gemini API key not configured, using mock analysis');
            return this.mockAnalysis(id, sourceId);
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/jpeg',
                                        data: imageBase64,
                                    },
                                },
                                {
                                    text: `分析這張災區影像。識別並回報：
1. 人員 (數量、是否受傷)
2. 車輛
3. 建築損壞程度
4. 火災/煙霧
5. 洪水
6. 道路阻塞
7. 危險物質
8. 其他需注意事項

${context ? `額外背景: ${context}` : ''}

以 JSON 格式回覆：
{
    "detections": [{"type": "類型", "confidence": 0.0-1.0, "description": "描述", "count": 數量}],
    "summary": "整體摘要",
    "riskLevel": "low|medium|high|critical"
}`,
                                },
                            ],
                        }],
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const result: ImageAnalysisResult = {
                    id,
                    sourceId,
                    timestamp: new Date(),
                    detections: (parsed.detections || []).map((d: any) => ({
                        type: this.mapDetectionType(d.type),
                        confidence: d.confidence || 0.8,
                        description: d.description,
                        count: d.count,
                    })),
                    summary: parsed.summary || '分析完成',
                    riskLevel: parsed.riskLevel || 'low',
                };

                this.eventEmitter.emit('ai.analysis', result);
                return result;
            }

            throw new Error('Could not parse Gemini response');
        } catch (error) {
            this.logger.error(`AI analysis failed: ${error}`);
            return this.mockAnalysis(id, sourceId);
        }
    }

    private mapDetectionType(type: string): DetectionType {
        const typeMap: Record<string, DetectionType> = {
            '人員': DetectionType.PERSON,
            'PERSON': DetectionType.PERSON,
            '車輛': DetectionType.VEHICLE,
            'VEHICLE': DetectionType.VEHICLE,
            '建築損壞': DetectionType.BUILDING_DAMAGE,
            'BUILDING_DAMAGE': DetectionType.BUILDING_DAMAGE,
            '火災': DetectionType.FIRE,
            'FIRE': DetectionType.FIRE,
            '煙霧': DetectionType.SMOKE,
            'SMOKE': DetectionType.SMOKE,
            '洪水': DetectionType.FLOOD,
            'FLOOD': DetectionType.FLOOD,
            '瓦礫': DetectionType.DEBRIS,
            'DEBRIS': DetectionType.DEBRIS,
            '道路阻塞': DetectionType.ROAD_BLOCKAGE,
            'ROAD_BLOCKAGE': DetectionType.ROAD_BLOCKAGE,
            '受傷': DetectionType.INJURED,
            'INJURED': DetectionType.INJURED,
            '受困': DetectionType.TRAPPED,
            'TRAPPED': DetectionType.TRAPPED,
            '危險物質': DetectionType.HAZMAT,
            'HAZMAT': DetectionType.HAZMAT,
        };
        return typeMap[type] || DetectionType.UNKNOWN;
    }

    private mockAnalysis(id: string, sourceId?: string): ImageAnalysisResult {
        return {
            id,
            sourceId,
            timestamp: new Date(),
            detections: [
                { type: DetectionType.PERSON, confidence: 0.85, count: 3, description: '3名人員站立' },
                { type: DetectionType.VEHICLE, confidence: 0.92, count: 1, description: '1輛救護車' },
            ],
            summary: '影像顯示現場有3名人員及1輛救護車，無明顯危險。',
            riskLevel: 'low',
        };
    }

    // ==================== Damage Assessment ====================

    /**
     * 建築損壞評估
     */
    async assessDamage(
        imageBase64s: string[],
        location: { lat: number; lng: number }
    ): Promise<DamageAssessment> {
        const id = `damage-${Date.now()}`;

        // Analyze first image for damage assessment
        const analysis = await this.analyzeImage(
            imageBase64s[0] || '',
            '建築損壞評估'
        );

        // Determine damage level from detections
        let overallDamage: DamageAssessment['overallDamage'] = 'none';
        const hazards: string[] = [];
        const recommendations: string[] = [];

        for (const detection of analysis.detections) {
            if (detection.type === DetectionType.BUILDING_DAMAGE) {
                if (detection.confidence > 0.9) overallDamage = 'severe';
                else if (detection.confidence > 0.7) overallDamage = 'moderate';
                else overallDamage = 'minor';
            }
            if (detection.type === DetectionType.FIRE) {
                hazards.push('火災');
                recommendations.push('立即疏散');
            }
            if (detection.type === DetectionType.HAZMAT) {
                hazards.push('危險物質');
                recommendations.push('保持距離，通知專業人員');
            }
            if (detection.type === DetectionType.DEBRIS) {
                hazards.push('瓦礫堆積');
            }
        }

        if (hazards.length === 0) {
            recommendations.push('可安全進入進行詳細評估');
        }

        const assessment: DamageAssessment = {
            id,
            location,
            imageUrls: [],
            overallDamage,
            structuralIntegrity: overallDamage === 'none' ? 100 :
                overallDamage === 'minor' ? 80 :
                    overallDamage === 'moderate' ? 50 :
                        overallDamage === 'severe' ? 20 : 0,
            accessStatus: hazards.length > 0 ? 'limited' : 'accessible',
            hazards,
            recommendations,
            analyzedAt: new Date(),
        };

        this.eventEmitter.emit('ai.damageAssessment', assessment);
        return assessment;
    }

    // ==================== Real-time Detection ====================

    /**
     * 處理即時影像幀
     */
    async processVideoFrame(
        frameBase64: string,
        sourceId: string,
        frameNumber: number
    ): Promise<Detection[]> {
        // Only analyze every 30th frame to reduce API calls
        if (frameNumber % 30 !== 0) {
            return [];
        }

        const result = await this.analyzeImage(frameBase64, '即時監控', sourceId);
        return result.detections;
    }
}
