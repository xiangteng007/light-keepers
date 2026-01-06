/**
 * Smart Assignment AI Use Case
 * Automatically matches volunteers to tasks based on skills, location, and availability
 */

import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from '../providers/gemini.provider';

export interface VolunteerProfile {
    id: string;
    name: string;
    skills: string[];
    certifications: string[];
    location?: { lat: number; lng: number };
    isAvailable: boolean;
    currentTasks: number;
    maxTasks: number;
    preferredCategories?: string[];
    rating?: number;
}

export interface TaskRequirement {
    id: string;
    title: string;
    description: string;
    category: string;
    requiredSkills: string[];
    urgency: 'low' | 'medium' | 'high' | 'critical';
    location?: { lat: number; lng: number };
    estimatedDuration: string;
    headcountNeeded: number;
}

export interface SmartAssignmentInput {
    task: TaskRequirement;
    availableVolunteers: VolunteerProfile[];
    maxRecommendations?: number;
}

export interface VolunteerRecommendation {
    volunteerId: string;
    volunteerName: string;
    matchScore: number;
    matchingSkills: string[];
    distanceKm?: number;
    reasoning: string;
}

export interface SmartAssignmentResult {
    success: boolean;
    recommendations?: VolunteerRecommendation[];
    alternativeStrategy?: string;
    error?: string;
}

const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        recommendations: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    volunteerId: { type: 'string' },
                    volunteerName: { type: 'string' },
                    matchScore: { type: 'number', description: '0-100 分數' },
                    matchingSkills: { type: 'array', items: { type: 'string' } },
                    distanceKm: { type: 'number' },
                    reasoning: { type: 'string' },
                },
                required: ['volunteerId', 'volunteerName', 'matchScore', 'reasoning'],
            },
        },
        alternativeStrategy: {
            type: 'string',
            description: '如果找不到合適志工的替代建議',
        },
    },
    required: ['recommendations'],
};

const SYSTEM_PROMPT = `你是一位災害應變志工調度專家。根據任務需求和志工資料，推薦最適合的志工人選。

評估標準：
1. 技能匹配度 (最重要)
2. 地理距離 (緊急任務更重要)
3. 目前負載 (避免過度分配)
4. 偏好和過往表現

回覆格式：
- recommendations: 推薦志工清單，依匹配度排序
- matchScore: 0-100 分數
- reasoning: 簡短說明推薦理由

如果沒有合適人選，請提供 alternativeStrategy。`;

@Injectable()
export class SmartAssignmentUseCase {
    public static readonly ID = 'assignment.smart.v1';
    private readonly logger = new Logger(SmartAssignmentUseCase.name);

    constructor(private readonly gemini: GeminiProvider) { }

    /**
     * Get smart volunteer recommendations for a task
     */
    async execute(input: SmartAssignmentInput): Promise<SmartAssignmentResult> {
        try {
            if (input.availableVolunteers.length === 0) {
                return {
                    success: true,
                    recommendations: [],
                    alternativeStrategy: '目前沒有可用志工，建議發送動員通知或等待志工上線',
                };
            }

            const maxRecs = input.maxRecommendations || 5;
            const filteredVolunteers = input.availableVolunteers
                .filter(v => v.isAvailable && v.currentTasks < v.maxTasks)
                .slice(0, 20); // Limit for token efficiency

            if (filteredVolunteers.length === 0) {
                return {
                    success: true,
                    recommendations: [],
                    alternativeStrategy: '所有志工目前都忙碌中，建議等待或降低任務優先級',
                };
            }

            const prompt = `
## 任務需求
- 標題: ${input.task.title}
- 描述: ${input.task.description}
- 類別: ${input.task.category}
- 緊急程度: ${input.task.urgency}
- 需要技能: ${input.task.requiredSkills.join(', ')}
- 預計時間: ${input.task.estimatedDuration}
- 需要人數: ${input.task.headcountNeeded}
${input.task.location ? `- 位置: (${input.task.location.lat}, ${input.task.location.lng})` : ''}

## 可用志工 (共 ${filteredVolunteers.length} 人)
${filteredVolunteers.map(v => `
- ID: ${v.id}
- 姓名: ${v.name}
- 技能: ${v.skills.join(', ')}
- 證照: ${v.certifications.join(', ') || '無'}
- 目前任務: ${v.currentTasks}/${v.maxTasks}
- 評分: ${v.rating || 'N/A'}
${v.location ? `- 位置: (${v.location.lat}, ${v.location.lng})` : ''}`).join('\n')}

請推薦最多 ${maxRecs} 位最適合的志工，依匹配度排序。`;

            const response = await this.gemini.run({
                useCaseId: SmartAssignmentUseCase.ID,
                prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
                schema: OUTPUT_SCHEMA,
            });

            const result = response.outputJson as any;

            return {
                success: true,
                recommendations: result.recommendations || [],
                alternativeStrategy: result.alternativeStrategy,
            };
        } catch (error) {
            this.logger.error('Smart assignment failed', error);
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    static getMetadata() {
        return {
            id: SmartAssignmentUseCase.ID,
            name: '智能志工派遣',
            description: '使用 AI 根據技能、位置、可用性自動推薦最適合的志工',
            inputType: 'SmartAssignmentInput',
            outputType: 'SmartAssignmentResult',
            estimatedDuration: '5-10 秒',
            costLevel: 'low',
        };
    }
}
