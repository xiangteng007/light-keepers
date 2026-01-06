import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Emotion Analysis Service
 * Analyze voice and text to detect emotional state of callers
 */
@Injectable()
export class EmotionAnalysisService {
    private readonly logger = new Logger(EmotionAnalysisService.name);

    // Emotion detection thresholds
    private readonly STRESS_KEYWORDS = [
        '救命', '快', '急', '痛', '怕', '危險', '幫幫我', '來不及',
        'help', 'urgent', 'pain', 'scared', 'danger', 'hurry',
    ];

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Analyze emotion from voice audio
     */
    async analyzeVoice(audio: Buffer): Promise<EmotionResult> {
        // Voice features that indicate stress:
        // - Higher pitch
        // - Faster speech rate
        // - Louder volume
        // - Trembling/shaky voice

        const features = await this.extractVoiceFeatures(audio);

        return this.classifyEmotion(features);
    }

    /**
     * Analyze emotion from text
     */
    async analyzeText(text: string): Promise<EmotionResult> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            return this.analyzeTextHeuristic(text);
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Analyze the emotional state of the person who wrote this message. 
                Return JSON only with format: {"emotion": "calm|anxious|distressed|panicked|calm", "stress_level": 0-100, "urgency": "low|medium|high|critical", "needs_support": boolean}
                
                Message: "${text}"`,
                            }],
                        }],
                    }),
                },
            );

            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (resultText) {
                const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        emotion: parsed.emotion || 'unknown',
                        stressLevel: parsed.stress_level || 0,
                        urgency: parsed.urgency || 'low',
                        needsSupport: parsed.needs_support || false,
                        confidence: 0.85,
                    };
                }
            }
        } catch (error) {
            this.logger.error('AI emotion analysis failed', error);
        }

        return this.analyzeTextHeuristic(text);
    }

    /**
     * Combined analysis of voice and text
     */
    async analyzeCombined(audio: Buffer | null, text: string): Promise<EmotionResult> {
        const textResult = await this.analyzeText(text);

        if (audio) {
            const voiceResult = await this.analyzeVoice(audio);
            return this.mergeResults(textResult, voiceResult);
        }

        return textResult;
    }

    /**
     * Monitor emotional progression over time
     */
    trackEmotionalProgression(userId: string, result: EmotionResult): EmotionTrend {
        // Would store history and calculate trend

        if (result.stressLevel > 80) {
            this.eventEmitter.emit('emotion.critical', { userId, result });
        }

        return {
            current: result,
            trend: 'stable',
            recommendations: this.getRecommendations(result),
        };
    }

    // Private methods
    private async extractVoiceFeatures(audio: Buffer): Promise<VoiceFeatures> {
        // Would analyze audio features
        return {
            pitch: 200,
            pitchVariance: 50,
            speechRate: 150,
            volume: 0.7,
            tremor: 0.1,
        };
    }

    private classifyEmotion(features: VoiceFeatures): EmotionResult {
        let stressLevel = 0;

        // High pitch indicates stress
        if (features.pitch > 250) stressLevel += 20;

        // High variance indicates instability
        if (features.pitchVariance > 100) stressLevel += 15;

        // Fast speech indicates urgency
        if (features.speechRate > 200) stressLevel += 20;

        // Loud volume indicates distress
        if (features.volume > 0.8) stressLevel += 15;

        // Tremor indicates fear
        if (features.tremor > 0.3) stressLevel += 30;

        let emotion: string;
        let urgency: string;

        if (stressLevel >= 70) {
            emotion = 'panicked';
            urgency = 'critical';
        } else if (stressLevel >= 50) {
            emotion = 'distressed';
            urgency = 'high';
        } else if (stressLevel >= 30) {
            emotion = 'anxious';
            urgency = 'medium';
        } else {
            emotion = 'calm';
            urgency = 'low';
        }

        return {
            emotion,
            stressLevel,
            urgency,
            needsSupport: stressLevel > 50,
            confidence: 0.7,
        };
    }

    private analyzeTextHeuristic(text: string): EmotionResult {
        const lowerText = text.toLowerCase();
        let stressScore = 0;

        // Check for stress keywords
        for (const keyword of this.STRESS_KEYWORDS) {
            if (lowerText.includes(keyword)) {
                stressScore += 15;
            }
        }

        // Check for exclamation marks
        const exclamations = (text.match(/!/g) || []).length;
        stressScore += exclamations * 10;

        // Check for ALL CAPS
        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
        if (capsRatio > 0.5) stressScore += 20;

        // Check for repeated characters (e.g., "helppp")
        if (/(.)\1{2,}/.test(text)) stressScore += 10;

        stressScore = Math.min(stressScore, 100);

        let emotion: string;
        let urgency: string;

        if (stressScore >= 60) {
            emotion = 'distressed';
            urgency = 'high';
        } else if (stressScore >= 30) {
            emotion = 'anxious';
            urgency = 'medium';
        } else {
            emotion = 'calm';
            urgency = 'low';
        }

        return {
            emotion,
            stressLevel: stressScore,
            urgency,
            needsSupport: stressScore > 40,
            confidence: 0.6,
        };
    }

    private mergeResults(text: EmotionResult, voice: EmotionResult): EmotionResult {
        // Weight voice analysis higher (60/40)
        const combinedStress = text.stressLevel * 0.4 + voice.stressLevel * 0.6;

        return {
            emotion: voice.stressLevel > text.stressLevel ? voice.emotion : text.emotion,
            stressLevel: Math.round(combinedStress),
            urgency: combinedStress > 60 ? 'high' : combinedStress > 30 ? 'medium' : 'low',
            needsSupport: combinedStress > 50,
            confidence: (text.confidence + voice.confidence) / 2,
        };
    }

    private getRecommendations(result: EmotionResult): string[] {
        const recommendations: string[] = [];

        if (result.stressLevel > 70) {
            recommendations.push('派遣心理支援人員');
            recommendations.push('使用平靜語調溝通');
        } else if (result.stressLevel > 40) {
            recommendations.push('提供明確指示');
            recommendations.push('確認安全狀態');
        }

        if (result.needsSupport) {
            recommendations.push('安排後續心理諮詢');
        }

        return recommendations;
    }
}

// Type definitions
interface EmotionResult {
    emotion: string;
    stressLevel: number;
    urgency: string;
    needsSupport: boolean;
    confidence: number;
}

interface VoiceFeatures {
    pitch: number;
    pitchVariance: number;
    speechRate: number;
    volume: number;
    tremor: number;
}

interface EmotionTrend {
    current: EmotionResult;
    trend: 'improving' | 'stable' | 'worsening';
    recommendations: string[];
}
