import { Injectable, Logger } from '@nestjs/common';

export interface AerialImage {
    id: string;
    missionId?: string;
    droneId?: string;
    imageUrl: string;
    thumbnailUrl?: string;
    position: { lat: number; lng: number; altitude: number };
    heading: number;
    capturedAt: Date;
    metadata: {
        resolution: { width: number; height: number };
        format: string;
        fileSize: number;
        gsd?: number; // Ground Sample Distance
    };
    analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
    analysisResults?: AnalysisResult[];
}

export interface AnalysisResult {
    type: 'building_damage' | 'person' | 'vehicle' | 'flood' | 'fire' | 'debris' | 'road_block';
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
    geoPosition?: { lat: number; lng: number };
    severity?: 'none' | 'minor' | 'moderate' | 'severe' | 'destroyed';
    metadata?: Record<string, any>;
}

export interface DamageAssessment {
    id: string;
    areaId: string;
    areaName: string;
    analyzedImages: number;
    summary: {
        buildingsAnalyzed: number;
        damagedBuildings: { minor: number; moderate: number; severe: number; destroyed: number };
        peopleDetected: number;
        vehiclesDetected: number;
        roadsBlocked: number;
    };
    estimatedAffectedPopulation?: number;
    createdAt: Date;
}

export interface ComparisonResult {
    beforeImage: string;
    afterImage: string;
    changes: {
        type: string;
        confidence: number;
        description: string;
        position: { lat: number; lng: number };
    }[];
    overallChangeScore: number;
}

@Injectable()
export class AerialImageAnalysisService {
    private readonly logger = new Logger(AerialImageAnalysisService.name);
    private images: Map<string, AerialImage> = new Map();
    private assessments: Map<string, DamageAssessment> = new Map();
    private analysisQueue: string[] = [];

    // ===== 影像管理 =====

    uploadImage(data: Omit<AerialImage, 'id' | 'analysisStatus'>): AerialImage {
        const image: AerialImage = {
            ...data,
            id: `img-${Date.now()}`,
            analysisStatus: 'pending',
        };
        this.images.set(image.id, image);
        this.analysisQueue.push(image.id);
        this.logger.log(`Image uploaded: ${image.id}`);
        return image;
    }

    getImage(id: string): AerialImage | undefined {
        return this.images.get(id);
    }

    getImagesByMission(missionId: string): AerialImage[] {
        return Array.from(this.images.values())
            .filter(img => img.missionId === missionId)
            .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
    }

    getPendingImages(): AerialImage[] {
        return this.analysisQueue
            .map(id => this.images.get(id))
            .filter((img): img is AerialImage => img !== undefined);
    }

    // ===== AI 分析 =====

    async analyzeImage(imageId: string): Promise<AerialImage | null> {
        const image = this.images.get(imageId);
        if (!image) return null;

        image.analysisStatus = 'processing';
        this.logger.log(`Analyzing image: ${imageId}`);

        // 模擬 AI 分析
        await new Promise(resolve => setTimeout(resolve, 100));

        const results: AnalysisResult[] = [];

        // 模擬偵測結果
        const detectionTypes: AnalysisResult['type'][] = ['building_damage', 'person', 'vehicle', 'debris'];
        const numDetections = Math.floor(Math.random() * 5);

        for (let i = 0; i < numDetections; i++) {
            const type = detectionTypes[Math.floor(Math.random() * detectionTypes.length)];
            results.push({
                type,
                confidence: 0.7 + Math.random() * 0.3,
                boundingBox: {
                    x: Math.random() * 0.8,
                    y: Math.random() * 0.8,
                    width: 0.05 + Math.random() * 0.15,
                    height: 0.05 + Math.random() * 0.15,
                },
                geoPosition: {
                    lat: image.position.lat + (Math.random() - 0.5) * 0.001,
                    lng: image.position.lng + (Math.random() - 0.5) * 0.001,
                },
                severity: type === 'building_damage'
                    ? (['minor', 'moderate', 'severe', 'destroyed'] as const)[Math.floor(Math.random() * 4)]
                    : undefined,
            });
        }

        image.analysisResults = results;
        image.analysisStatus = 'completed';

        // 從佇列移除
        const queueIndex = this.analysisQueue.indexOf(imageId);
        if (queueIndex > -1) this.analysisQueue.splice(queueIndex, 1);

        this.logger.log(`Analysis completed: ${imageId}, ${results.length} detections`);
        return image;
    }

    async batchAnalyze(imageIds: string[]): Promise<{ processed: number; failed: number }> {
        let processed = 0;
        let failed = 0;

        for (const id of imageIds) {
            const result = await this.analyzeImage(id);
            if (result) processed++;
            else failed++;
        }

        return { processed, failed };
    }

    // ===== 損害評估 =====

    generateDamageAssessment(areaId: string, areaName: string, imageIds: string[]): DamageAssessment {
        const summary = {
            buildingsAnalyzed: 0,
            damagedBuildings: { minor: 0, moderate: 0, severe: 0, destroyed: 0 },
            peopleDetected: 0,
            vehiclesDetected: 0,
            roadsBlocked: 0,
        };

        for (const id of imageIds) {
            const image = this.images.get(id);
            if (!image?.analysisResults) continue;

            for (const result of image.analysisResults) {
                switch (result.type) {
                    case 'building_damage':
                        summary.buildingsAnalyzed++;
                        if (result.severity && result.severity !== 'none') {
                            summary.damagedBuildings[result.severity]++;
                        }
                        break;
                    case 'person':
                        summary.peopleDetected++;
                        break;
                    case 'vehicle':
                        summary.vehiclesDetected++;
                        break;
                    case 'road_block':
                        summary.roadsBlocked++;
                        break;
                }
            }
        }

        const assessment: DamageAssessment = {
            id: `assess-${Date.now()}`,
            areaId,
            areaName,
            analyzedImages: imageIds.length,
            summary,
            estimatedAffectedPopulation: summary.peopleDetected * 2.5,
            createdAt: new Date(),
        };

        this.assessments.set(assessment.id, assessment);
        return assessment;
    }

    getDamageAssessment(id: string): DamageAssessment | undefined {
        return this.assessments.get(id);
    }

    getAllAssessments(): DamageAssessment[] {
        return Array.from(this.assessments.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // ===== 前後比對 =====

    compareBeforeAfter(beforeImageId: string, afterImageId: string): ComparisonResult | null {
        const before = this.images.get(beforeImageId);
        const after = this.images.get(afterImageId);

        if (!before || !after) return null;

        // 模擬比對結果
        const changes: ComparisonResult['changes'] = [];
        const numChanges = Math.floor(Math.random() * 5);

        for (let i = 0; i < numChanges; i++) {
            changes.push({
                type: ['new_damage', 'collapsed_structure', 'flood_expansion', 'cleared_debris'][Math.floor(Math.random() * 4)],
                confidence: 0.6 + Math.random() * 0.4,
                description: '偵測到變化',
                position: {
                    lat: after.position.lat + (Math.random() - 0.5) * 0.001,
                    lng: after.position.lng + (Math.random() - 0.5) * 0.001,
                },
            });
        }

        return {
            beforeImage: beforeImageId,
            afterImage: afterImageId,
            changes,
            overallChangeScore: changes.length > 0 ? changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length : 0,
        };
    }

    // ===== 人員偵測統計 =====

    getPersonDetections(missionId?: string): { total: number; positions: { lat: number; lng: number; imageId: string }[] } {
        const positions: { lat: number; lng: number; imageId: string }[] = [];

        this.images.forEach((image) => {
            if (missionId && image.missionId !== missionId) return;
            if (!image.analysisResults) return;

            for (const result of image.analysisResults) {
                if (result.type === 'person' && result.geoPosition) {
                    positions.push({
                        lat: result.geoPosition.lat,
                        lng: result.geoPosition.lng,
                        imageId: image.id,
                    });
                }
            }
        });

        return { total: positions.length, positions };
    }
}
