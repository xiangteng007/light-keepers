import { Injectable, Logger } from '@nestjs/common';

/**
 * Sphere Standards 領域
 * @see https://spherestandards.org/
 */
export enum SphereStandard {
    WASH = 'WASH',           // 供水、衛生和個人衛生促進
    FOOD_SECURITY = 'FOOD',  // 糧食安全和營養
    SHELTER = 'SHELTER',     // 住所和定居點
    HEALTH = 'HEALTH',       // 健康
}

export interface SphereIndicator {
    id: string;
    standard: SphereStandard;
    name: string;
    description: string;
    targetValue: number;
    unit: string;
    guidance: string;
}

export interface ComplianceCheck {
    indicatorId: string;
    indicatorName: string;
    standard: SphereStandard;
    targetValue: number;
    actualValue: number;
    unit: string;
    compliant: boolean;
    compliancePercentage: number;
    recommendations: string[];
}

export interface ComplianceReport {
    missionId: string;
    missionName: string;
    checkedAt: Date;
    overallCompliance: number;
    checks: ComplianceCheck[];
    summary: {
        compliant: number;
        partial: number;
        nonCompliant: number;
    };
}

/**
 * Sphere Standards Service
 * 
 * 提供人道主義 Sphere 標準合規檢核：
 * - WASH 標準
 * - 糧食安全標準
 * - 住所標準
 * - 健康標準
 */
@Injectable()
export class SphereStandardsService {
    private readonly logger = new Logger(SphereStandardsService.name);

    // Sphere 核心指標
    private readonly indicators: SphereIndicator[] = [
        // WASH
        {
            id: 'wash-1',
            standard: SphereStandard.WASH,
            name: '每人每日用水量',
            description: '每人每日最低用水量',
            targetValue: 15,
            unit: 'L/人/日',
            guidance: '生存所需最低 7.5L，正常生活需 15-20L',
        },
        {
            id: 'wash-2',
            standard: SphereStandard.WASH,
            name: '廁所比例',
            description: '每個廁所服務的最大人數',
            targetValue: 20,
            unit: '人/廁所',
            guidance: '公共廁所不超過 50 人，家庭廁所不超過 20 人',
        },
        {
            id: 'wash-3',
            standard: SphereStandard.WASH,
            name: '取水距離',
            description: '住所到取水點的最大距離',
            targetValue: 500,
            unit: '公尺',
            guidance: '取水點應在住所 500 公尺內',
        },

        // Food Security
        {
            id: 'food-1',
            standard: SphereStandard.FOOD_SECURITY,
            name: '每日熱量攝取',
            description: '每人每日最低熱量攝取',
            targetValue: 2100,
            unit: 'kcal/人/日',
            guidance: '成人平均需求，可依年齡、性別調整',
        },
        {
            id: 'food-2',
            standard: SphereStandard.FOOD_SECURITY,
            name: '蛋白質攝取',
            description: '熱量中蛋白質比例',
            targetValue: 10,
            unit: '%',
            guidance: '蛋白質應佔總熱量 10-12%',
        },

        // Shelter
        {
            id: 'shelter-1',
            standard: SphereStandard.SHELTER,
            name: '每人居住面積',
            description: '每人最低居住空間',
            targetValue: 3.5,
            unit: '平方公尺/人',
            guidance: '寒冷氣候可能需要更大空間',
        },
        {
            id: 'shelter-2',
            standard: SphereStandard.SHELTER,
            name: '毛毯配給',
            description: '每人毛毯數量',
            targetValue: 2,
            unit: '條/人',
            guidance: '寒冷地區可能需要更多',
        },

        // Health
        {
            id: 'health-1',
            standard: SphereStandard.HEALTH,
            name: '初級醫療覆蓋',
            description: '每一萬人口的健康設施',
            targetValue: 1,
            unit: '設施/萬人',
            guidance: '每萬人至少一個初級醫療設施',
        },
        {
            id: 'health-2',
            standard: SphereStandard.HEALTH,
            name: '醫療人員比例',
            description: '每一萬人口的醫療人員',
            targetValue: 22,
            unit: '人員/萬人',
            guidance: 'WHO 建議最低標準',
        },
    ];

    /**
     * 取得所有指標
     */
    getIndicators(): SphereIndicator[] {
        return this.indicators;
    }

    /**
     * 依標準取得指標
     */
    getIndicatorsByStandard(standard: SphereStandard): SphereIndicator[] {
        return this.indicators.filter(i => i.standard === standard);
    }

    /**
     * 執行合規檢核
     */
    checkCompliance(
        missionId: string,
        missionName: string,
        data: Record<string, number>
    ): ComplianceReport {
        const checks: ComplianceCheck[] = [];
        let compliant = 0;
        let partial = 0;
        let nonCompliant = 0;

        for (const indicator of this.indicators) {
            const actualValue = data[indicator.id] ?? 0;
            const compliancePercentage = Math.min((actualValue / indicator.targetValue) * 100, 100);
            const isCompliant = actualValue >= indicator.targetValue;

            const check: ComplianceCheck = {
                indicatorId: indicator.id,
                indicatorName: indicator.name,
                standard: indicator.standard,
                targetValue: indicator.targetValue,
                actualValue,
                unit: indicator.unit,
                compliant: isCompliant,
                compliancePercentage,
                recommendations: isCompliant ? [] : this.getRecommendations(indicator, actualValue),
            };

            checks.push(check);

            if (compliancePercentage >= 100) {
                compliant++;
            } else if (compliancePercentage >= 70) {
                partial++;
            } else {
                nonCompliant++;
            }
        }

        const overallCompliance = checks.reduce((sum, c) => sum + c.compliancePercentage, 0) / checks.length;

        return {
            missionId,
            missionName,
            checkedAt: new Date(),
            overallCompliance,
            checks,
            summary: { compliant, partial, nonCompliant },
        };
    }

    /**
     * 快速檢核關鍵指標
     */
    quickCheck(data: Partial<{
        waterPerPerson: number;
        personsPerToilet: number;
        caloriesPerPerson: number;
        spacePerPerson: number;
    }>): { passed: boolean; issues: string[] } {
        const issues: string[] = [];

        if (data.waterPerPerson !== undefined && data.waterPerPerson < 15) {
            issues.push(`用水量不足: ${data.waterPerPerson}L (需 ≥15L/人/日)`);
        }

        if (data.personsPerToilet !== undefined && data.personsPerToilet > 20) {
            issues.push(`廁所不足: ${data.personsPerToilet}人/間 (需 ≤20人/間)`);
        }

        if (data.caloriesPerPerson !== undefined && data.caloriesPerPerson < 2100) {
            issues.push(`熱量不足: ${data.caloriesPerPerson}kcal (需 ≥2100kcal/人/日)`);
        }

        if (data.spacePerPerson !== undefined && data.spacePerPerson < 3.5) {
            issues.push(`空間不足: ${data.spacePerPerson}㎡ (需 ≥3.5㎡/人)`);
        }

        return { passed: issues.length === 0, issues };
    }

    // === Private ===

    private getRecommendations(indicator: SphereIndicator, actualValue: number): string[] {
        const gap = indicator.targetValue - actualValue;
        const recommendations: string[] = [];

        recommendations.push(`需增加 ${gap.toFixed(1)} ${indicator.unit} 以達標`);
        recommendations.push(indicator.guidance);

        return recommendations;
    }
}
