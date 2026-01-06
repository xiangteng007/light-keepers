import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Damage Simulation Service
 * Structural damage assessment and collapse risk prediction
 */
@Injectable()
export class DamageSimulationService {
    private readonly logger = new Logger(DamageSimulationService.name);

    private assessments: Map<string, DamageAssessment> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * Assess building structural damage
     */
    async assessStructure(building: BuildingInfo, observations: DamageObservation[]): Promise<DamageAssessment> {
        const assessment: DamageAssessment = {
            id: `damage-${Date.now()}`,
            buildingId: building.id,
            buildingName: building.name,
            structureType: building.structureType,
            yearBuilt: building.yearBuilt,
            observations,
            overallRisk: 'unknown',
            collapseRisk: 0,
            recommendations: [],
            assessedAt: new Date(),
        };

        // Calculate damage score
        const damageScore = this.calculateDamageScore(observations, building);

        // Determine risk level
        assessment.overallRisk = this.determineRiskLevel(damageScore);
        assessment.collapseRisk = damageScore;

        // Generate recommendations
        assessment.recommendations = this.generateRecommendations(assessment);

        this.assessments.set(assessment.id, assessment);

        return assessment;
    }

    /**
     * Simulate building response to earthquake
     */
    simulateEarthquake(building: BuildingInfo, magnitude: number, distance: number): EarthquakeSimResult {
        // Simplified simulation based on building type and age
        const baseVulnerability = this.getBaseVulnerability(building);
        const shakingIntensity = this.calculateShakingIntensity(magnitude, distance);

        const damageIndex = baseVulnerability * shakingIntensity;

        return {
            buildingId: building.id,
            magnitude,
            distance,
            shakingIntensity,
            expectedDamage: this.indexToDamageLevel(damageIndex),
            collapseProb: Math.min(damageIndex / 100, 1),
            evacuationAdvised: damageIndex > 50,
            structuralInspectionRequired: damageIndex > 30,
        };
    }

    /**
     * Run flood damage simulation
     */
    simulateFlood(building: BuildingInfo, waterLevel: number): FloodSimResult {
        const floors = building.floors || 1;
        const floorHeight = 3; // meters

        const affectedFloors = Math.min(Math.ceil(waterLevel / floorHeight), floors);
        const damagePercentage = (affectedFloors / floors) * 100;

        const contentsDamage = waterLevel > 0.3 ? 'high' : waterLevel > 0.1 ? 'medium' : 'low';
        const electricalRisk = waterLevel > 0.5;
        const foundationRisk = waterLevel > 1.0 && building.yearBuilt < 1990;

        return {
            buildingId: building.id,
            waterLevel,
            affectedFloors,
            damagePercentage,
            contentsDamage,
            electricalRisk,
            foundationRisk,
            recommendations: [
                waterLevel > 0.3 ? '切斷電源' : null,
                waterLevel > 0.5 ? '疏散至高樓層' : null,
                foundationRisk ? '監測地基結構' : null,
            ].filter(Boolean) as string[],
        };
    }

    /**
     * Get area-wide damage assessment
     */
    getAreaAssessment(bounds: GeoBounds): AreaDamageReport {
        const assessments = Array.from(this.assessments.values());

        const critical = assessments.filter((a) => a.overallRisk === 'critical').length;
        const high = assessments.filter((a) => a.overallRisk === 'high').length;
        const moderate = assessments.filter((a) => a.overallRisk === 'moderate').length;

        return {
            bounds,
            totalAssessed: assessments.length,
            riskDistribution: { critical, high, moderate, low: assessments.length - critical - high - moderate },
            priorityBuildings: assessments
                .filter((a) => a.overallRisk === 'critical' || a.overallRisk === 'high')
                .map((a) => ({ id: a.buildingId, name: a.buildingName, risk: a.overallRisk })),
            timestamp: new Date(),
        };
    }

    // Private methods
    private calculateDamageScore(observations: DamageObservation[], building: BuildingInfo): number {
        let score = 0;

        const weights: Record<string, number> = {
            foundation_crack: 25,
            wall_crack: 15,
            column_damage: 30,
            beam_damage: 25,
            roof_damage: 20,
            window_damage: 5,
            floor_tilt: 35,
        };

        for (const obs of observations) {
            const weight = weights[obs.type] || 10;
            const severityMultiplier = obs.severity === 'severe' ? 1.5 : obs.severity === 'moderate' ? 1 : 0.5;
            score += weight * severityMultiplier;
        }

        // Age factor
        if (building.yearBuilt < 1980) score *= 1.3;
        else if (building.yearBuilt < 2000) score *= 1.1;

        return Math.min(score, 100);
    }

    private determineRiskLevel(score: number): string {
        if (score >= 70) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 30) return 'moderate';
        return 'low';
    }

    private generateRecommendations(assessment: DamageAssessment): string[] {
        const recommendations: string[] = [];

        if (assessment.overallRisk === 'critical') {
            recommendations.push('立即疏散所有人員');
            recommendations.push('封鎖建築周圍區域');
            recommendations.push('請結構技師進行詳細評估');
        } else if (assessment.overallRisk === 'high') {
            recommendations.push('限制進入');
            recommendations.push('安排專業檢測');
            recommendations.push('監控裂縫變化');
        } else if (assessment.overallRisk === 'moderate') {
            recommendations.push('定期監測');
            recommendations.push('記錄變化');
        }

        return recommendations;
    }

    private getBaseVulnerability(building: BuildingInfo): number {
        const typeVuln: Record<string, number> = {
            'reinforced_concrete': 0.3,
            'steel_frame': 0.25,
            'brick': 0.6,
            'wood': 0.7,
            'mixed': 0.5,
        };

        let vuln = typeVuln[building.structureType] || 0.5;

        if (building.yearBuilt < 1970) vuln *= 1.5;
        else if (building.yearBuilt < 1990) vuln *= 1.2;

        return vuln;
    }

    private calculateShakingIntensity(magnitude: number, distance: number): number {
        // Simplified attenuation model
        const base = Math.pow(10, (magnitude - 1) / 2);
        const attenuation = Math.exp(-0.003 * distance);
        return base * attenuation * 10;
    }

    private indexToDamageLevel(index: number): string {
        if (index > 80) return 'collapse';
        if (index > 60) return 'severe';
        if (index > 40) return 'moderate';
        if (index > 20) return 'light';
        return 'none';
    }
}

// Types
interface BuildingInfo {
    id: string;
    name: string;
    structureType: string;
    yearBuilt: number;
    floors?: number;
    location?: { lat: number; lng: number };
}

interface DamageObservation {
    type: string;
    location: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
    photos?: string[];
}

interface DamageAssessment {
    id: string;
    buildingId: string;
    buildingName: string;
    structureType: string;
    yearBuilt: number;
    observations: DamageObservation[];
    overallRisk: string;
    collapseRisk: number;
    recommendations: string[];
    assessedAt: Date;
}

interface EarthquakeSimResult {
    buildingId: string;
    magnitude: number;
    distance: number;
    shakingIntensity: number;
    expectedDamage: string;
    collapseProb: number;
    evacuationAdvised: boolean;
    structuralInspectionRequired: boolean;
}

interface FloodSimResult {
    buildingId: string;
    waterLevel: number;
    affectedFloors: number;
    damagePercentage: number;
    contentsDamage: string;
    electricalRisk: boolean;
    foundationRisk: boolean;
    recommendations: string[];
}

interface GeoBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

interface AreaDamageReport {
    bounds: GeoBounds;
    totalAssessed: number;
    riskDistribution: { critical: number; high: number; moderate: number; low: number };
    priorityBuildings: { id: string; name: string; risk: string }[];
    timestamp: Date;
}
