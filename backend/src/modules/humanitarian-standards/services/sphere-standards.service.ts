/**
 * Sphere Standards Service
 * 
 * Sphere Humanitarian Standards compliance checking
 * @see https://spherestandards.org/
 * 
 * The Sphere Handbook provides guidance on the minimum standards 
 * for humanitarian response in four technical areas.
 */
import { Injectable, Logger } from '@nestjs/common';

export interface SphereAssessment {
    standard: SphereStandardCategory;
    indicator: string;
    target: number | string;
    actual: number | string;
    compliant: boolean;
    notes?: string;
}

export enum SphereStandardCategory {
    WASH = 'WASH',
    FOOD_SECURITY = 'Food Security and Nutrition',
    SHELTER = 'Shelter and Settlement',
    HEALTH = 'Health',
    PROTECTION = 'Protection',
}

export interface SphereComplianceReport {
    assessedAt: Date;
    location: string;
    assessor: string;
    overallCompliance: number; // 0-100%
    assessments: SphereAssessment[];
    recommendations: string[];
}

/** Facility data structure for Sphere assessments */
export interface FacilityData {
    location?: string;
    population?: number;
    waterSupplyLiters?: number;
    toiletCount?: number;
    coveredAreaM2?: number;
    dailyKcal?: number;
    drugAvailabilityPercent?: number;
    [key: string]: unknown;
}

@Injectable()
export class SphereStandardsService {
    private readonly logger = new Logger(SphereStandardsService.name);

    /**
     * Sphere minimum standards reference
     */
    private readonly SPHERE_STANDARDS = {
        [SphereStandardCategory.WASH]: {
            waterQuantity: { min: 15, unit: 'liters/person/day', description: 'Minimum water for drinking, cooking, hygiene' },
            waterQuality: { standard: 'WHO Guidelines', description: 'Safe at point of use' },
            toiletRatio: { max: 20, unit: 'people/toilet', description: 'Maximum users per toilet' },
            handwashingStations: { min: 1, unit: 'per 10 toilets', description: 'Handwashing facilities' },
        },
        [SphereStandardCategory.SHELTER]: {
            coveredSpace: { min: 3.5, unit: 'm²/person', description: 'Minimum covered living space' },
            thermalComfort: { standard: 'Climate appropriate', description: 'Protection from elements' },
            privacy: { standard: 'Family level', description: 'Privacy for families' },
        },
        [SphereStandardCategory.FOOD_SECURITY]: {
            kcalPerDay: { min: 2100, unit: 'kcal/person/day', description: 'Minimum energy intake' },
            proteinIntake: { min: 10, unit: '%', description: 'Protein as % of total energy' },
            fatIntake: { min: 17, unit: '%', description: 'Fat as % of total energy' },
        },
        [SphereStandardCategory.HEALTH]: {
            healthFacilityAccess: { max: 1, unit: 'hour walk', description: 'Time to nearest health facility' },
            clinicianRatio: { max: 50, unit: 'consultations/clinician/day', description: 'Maximum workload' },
            drugAvailability: { min: 80, unit: '%', description: 'Essential drugs availability' },
        },
        [SphereStandardCategory.PROTECTION]: {
            safeSpaces: { min: 1, unit: 'per camp', description: 'Dedicated safe spaces for vulnerable groups' },
            referralPathways: { standard: 'Established', description: 'Clear referral pathways for protection cases' },
            awarenessTraining: { min: 1, unit: 'session/week', description: 'Community awareness on protection' },
        },
    };

    /**
     * Assess Sphere compliance for a shelter/camp
     */
    async assessCompliance(
        facilityData: FacilityData,
        category: SphereStandardCategory
    ): Promise<SphereAssessment[]> {
        this.logger.log(`Assessing Sphere compliance for ${category}`);

        const standards = this.SPHERE_STANDARDS[category];
        if (!standards) {
            return [];
        }

        const assessments: SphereAssessment[] = [];

        switch (category) {
            case SphereStandardCategory.WASH:
                assessments.push(...this.assessWash(facilityData, standards));
                break;
            case SphereStandardCategory.SHELTER:
                assessments.push(...this.assessShelter(facilityData, standards));
                break;
            case SphereStandardCategory.FOOD_SECURITY:
                assessments.push(...this.assessFoodSecurity(facilityData, standards));
                break;
            case SphereStandardCategory.HEALTH:
                assessments.push(...this.assessHealth(facilityData, standards));
                break;
        }

        return assessments;
    }

    private assessWash(data: FacilityData, standards: any): SphereAssessment[] {
        const assessments: SphereAssessment[] = [];

        // Water quantity
        if (data.waterSupplyLiters != null && data.population != null) {
            const waterPerPerson = data.waterSupplyLiters / data.population;
            assessments.push({
                standard: SphereStandardCategory.WASH,
                indicator: 'Water Quantity',
                target: `${standards.waterQuantity.min} ${standards.waterQuantity.unit}`,
                actual: `${waterPerPerson.toFixed(1)} liters/person/day`,
                compliant: waterPerPerson >= standards.waterQuantity.min,
                notes: standards.waterQuantity.description,
            });
        }

        // Toilet ratio
        if (data.toiletCount && data.population) {
            const toiletRatio = data.population / data.toiletCount;
            assessments.push({
                standard: SphereStandardCategory.WASH,
                indicator: 'Toilet Ratio',
                target: `max ${standards.toiletRatio.max} ${standards.toiletRatio.unit}`,
                actual: `${toiletRatio.toFixed(0)} people/toilet`,
                compliant: toiletRatio <= standards.toiletRatio.max,
                notes: standards.toiletRatio.description,
            });
        }

        return assessments;
    }

    private assessShelter(data: FacilityData, standards: any): SphereAssessment[] {
        const assessments: SphereAssessment[] = [];

        // Covered space
        if (data.coveredAreaM2 && data.population) {
            const spacePerPerson = data.coveredAreaM2 / data.population;
            assessments.push({
                standard: SphereStandardCategory.SHELTER,
                indicator: 'Covered Living Space',
                target: `${standards.coveredSpace.min} ${standards.coveredSpace.unit}`,
                actual: `${spacePerPerson.toFixed(1)} m²/person`,
                compliant: spacePerPerson >= standards.coveredSpace.min,
                notes: standards.coveredSpace.description,
            });
        }

        return assessments;
    }

    private assessFoodSecurity(data: FacilityData, standards: any): SphereAssessment[] {
        const assessments: SphereAssessment[] = [];

        // Caloric intake
        if (data.dailyKcal) {
            assessments.push({
                standard: SphereStandardCategory.FOOD_SECURITY,
                indicator: 'Daily Caloric Intake',
                target: `${standards.kcalPerDay.min} ${standards.kcalPerDay.unit}`,
                actual: `${data.dailyKcal} kcal/person/day`,
                compliant: data.dailyKcal >= standards.kcalPerDay.min,
                notes: standards.kcalPerDay.description,
            });
        }

        return assessments;
    }

    private assessHealth(data: FacilityData, standards: any): SphereAssessment[] {
        const assessments: SphereAssessment[] = [];

        // Drug availability
        if (data.drugAvailabilityPercent !== undefined) {
            assessments.push({
                standard: SphereStandardCategory.HEALTH,
                indicator: 'Essential Drugs Availability',
                target: `${standards.drugAvailability.min}${standards.drugAvailability.unit}`,
                actual: `${data.drugAvailabilityPercent}%`,
                compliant: data.drugAvailabilityPercent >= standards.drugAvailability.min,
                notes: standards.drugAvailability.description,
            });
        }

        return assessments;
    }

    /**
     * Generate compliance report
     */
    async generateReport(
        facilityData: FacilityData,
        assessor: string
    ): Promise<SphereComplianceReport> {
        const allAssessments: SphereAssessment[] = [];

        for (const category of Object.values(SphereStandardCategory)) {
            const assessments = await this.assessCompliance(facilityData, category);
            allAssessments.push(...assessments);
        }

        const compliantCount = allAssessments.filter(a => a.compliant).length;
        const overallCompliance = allAssessments.length > 0
            ? Math.round((compliantCount / allAssessments.length) * 100)
            : 0;

        const recommendations = allAssessments
            .filter(a => !a.compliant)
            .map(a => `Improve ${a.indicator}: Current ${a.actual}, Target ${a.target}`);

        return {
            assessedAt: new Date(),
            location: facilityData.location || 'Unknown',
            assessor,
            overallCompliance,
            assessments: allAssessments,
            recommendations,
        };
    }

    /**
     * Get Sphere standards reference
     */
    getStandardsReference(): typeof this.SPHERE_STANDARDS {
        return { ...this.SPHERE_STANDARDS };
    }
}
