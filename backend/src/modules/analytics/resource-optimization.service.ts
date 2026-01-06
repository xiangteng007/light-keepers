/**
 * Resource Optimization Service
 * Smart resource allocation and volunteer dispatch recommendations
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AllocationRecommendation {
    resourceId: string;
    resourceName: string;
    currentLocation: string;
    recommendedLocation: string;
    quantity: number;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedImpact: string;
}

export interface VolunteerDispatch {
    volunteerId: string;
    volunteerName: string;
    currentStatus: string;
    recommendedTask: string;
    taskLocation: string;
    matchScore: number; // 0-100
    matchReasons: string[];
}

export interface OptimizationReport {
    generatedAt: Date;
    resourceAllocations: AllocationRecommendation[];
    volunteerDispatches: VolunteerDispatch[];
    efficiencyScore: number;
    recommendations: string[];
}

@Injectable()
export class ResourceOptimizationService {
    private readonly logger = new Logger(ResourceOptimizationService.name);

    constructor(private dataSource: DataSource) { }

    // ==================== Resource Allocation ====================

    /**
     * Generate smart resource allocation recommendations
     */
    async generateResourceAllocation(): Promise<AllocationRecommendation[]> {
        const recommendations: AllocationRecommendation[] = [];

        try {
            // Get active incidents by location
            const incidents = await this.getActiveIncidentsByLocation();

            // Get available resources
            const resources = await this.getAvailableResources();

            // Match resources to needs
            for (const incident of incidents) {
                const neededResources = this.determineNeededResources(incident.type);

                for (const needed of neededResources) {
                    const available = resources.find(r =>
                        r.category === needed.category && r.quantity >= needed.minQuantity
                    );

                    if (available) {
                        recommendations.push({
                            resourceId: available.id,
                            resourceName: available.name,
                            currentLocation: available.location,
                            recommendedLocation: incident.location,
                            quantity: Math.min(needed.recommendedQuantity, available.quantity),
                            reason: `Active ${incident.type} incident at ${incident.location}`,
                            priority: incident.severity === 'critical' ? 'urgent' :
                                incident.severity === 'high' ? 'high' : 'medium',
                            estimatedImpact: `Support ${incident.affectedCount} affected individuals`,
                        });
                    }
                }
            }

            return recommendations.slice(0, 10);
        } catch (error) {
            this.logger.error('Resource allocation failed', error);
            return [];
        }
    }

    // ==================== Volunteer Dispatch ====================

    /**
     * Generate smart volunteer dispatch recommendations
     */
    async generateVolunteerDispatch(): Promise<VolunteerDispatch[]> {
        const dispatches: VolunteerDispatch[] = [];

        try {
            // Get pending tasks
            const tasks = await this.getPendingTasks();

            // Get available volunteers
            const volunteers = await this.getAvailableVolunteers();

            // Match volunteers to tasks based on skills and location
            for (const task of tasks) {
                const matches = this.matchVolunteersToTask(task, volunteers);

                for (const match of matches.slice(0, 3)) {
                    dispatches.push({
                        volunteerId: match.volunteer.id,
                        volunteerName: match.volunteer.name,
                        currentStatus: match.volunteer.status,
                        recommendedTask: task.title,
                        taskLocation: task.location,
                        matchScore: match.score,
                        matchReasons: match.reasons,
                    });
                }
            }

            // Sort by match score
            return dispatches
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 15);
        } catch (error) {
            this.logger.error('Volunteer dispatch optimization failed', error);
            return [];
        }
    }

    // ==================== Full Optimization Report ====================

    /**
     * Generate comprehensive optimization report
     */
    async generateOptimizationReport(): Promise<OptimizationReport> {
        const [allocations, dispatches] = await Promise.all([
            this.generateResourceAllocation(),
            this.generateVolunteerDispatch(),
        ]);

        const efficiencyScore = this.calculateEfficiencyScore(allocations, dispatches);
        const recommendations = this.generateStrategicRecommendations(allocations, dispatches);

        return {
            generatedAt: new Date(),
            resourceAllocations: allocations,
            volunteerDispatches: dispatches,
            efficiencyScore,
            recommendations,
        };
    }

    // ==================== Private Helpers ====================

    private async getActiveIncidentsByLocation(): Promise<any[]> {
        const result = await this.safeQuery(`
            SELECT 
                location,
                type,
                severity,
                COUNT(*) as count
            FROM field_reports
            WHERE status IN ('pending', 'confirmed')
            AND created_at > NOW() - INTERVAL '48 hours'
            GROUP BY location, type, severity
            ORDER BY 
                CASE severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END
        `, []);

        return (result || []).map((r: any) => ({
            location: r.location || 'Unknown',
            type: r.type || 'general',
            severity: r.severity || 'medium',
            affectedCount: Number(r.count) * 5, // Estimate
        }));
    }

    private async getAvailableResources(): Promise<any[]> {
        const result = await this.safeQuery(`
            SELECT id, name, category, quantity, location
            FROM resources
            WHERE status = 'active'
            AND quantity > 0
            ORDER BY quantity DESC
        `, []);

        return result || [];
    }

    private async getPendingTasks(): Promise<any[]> {
        const result = await this.safeQuery(`
            SELECT id, title, description, location, priority, required_skills
            FROM tasks
            WHERE status = 'pending'
            ORDER BY 
                CASE priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END
            LIMIT 20
        `, []);

        return result || [];
    }

    private async getAvailableVolunteers(): Promise<any[]> {
        const result = await this.safeQuery(`
            SELECT a.id, a.display_name as name, a.status, v.skills, v.region
            FROM accounts a
            LEFT JOIN volunteers v ON a.id = v.account_id
            WHERE a.status = 'available'
            AND a.level >= 4
            LIMIT 50
        `, []);

        return result || [];
    }

    private determineNeededResources(incidentType: string): Array<{
        category: string;
        minQuantity: number;
        recommendedQuantity: number;
    }> {
        const resourceMap: Record<string, any[]> = {
            flood: [
                { category: 'water', minQuantity: 50, recommendedQuantity: 100 },
                { category: 'food', minQuantity: 30, recommendedQuantity: 60 },
                { category: 'blankets', minQuantity: 20, recommendedQuantity: 40 },
            ],
            fire: [
                { category: 'medical', minQuantity: 20, recommendedQuantity: 50 },
                { category: 'blankets', minQuantity: 30, recommendedQuantity: 50 },
            ],
            debris: [
                { category: 'tools', minQuantity: 10, recommendedQuantity: 25 },
                { category: 'medical', minQuantity: 15, recommendedQuantity: 30 },
            ],
            default: [
                { category: 'general', minQuantity: 20, recommendedQuantity: 40 },
            ],
        };

        return resourceMap[incidentType] || resourceMap.default;
    }

    private matchVolunteersToTask(task: any, volunteers: any[]): Array<{
        volunteer: any;
        score: number;
        reasons: string[];
    }> {
        return volunteers.map(volunteer => {
            let score = 50; // Base score
            const reasons: string[] = [];

            // Skill match
            const taskSkills = task.required_skills?.split(',') || [];
            const volunteerSkills = volunteer.skills?.split(',') || [];
            const matchedSkills = taskSkills.filter((s: string) =>
                volunteerSkills.some((vs: string) => vs.trim().toLowerCase().includes(s.trim().toLowerCase()))
            );

            if (matchedSkills.length > 0) {
                score += matchedSkills.length * 15;
                reasons.push(`Skills match: ${matchedSkills.join(', ')}`);
            }

            // Location proximity (simplified)
            if (volunteer.region && task.location?.includes(volunteer.region)) {
                score += 20;
                reasons.push('Local area expertise');
            }

            // Availability bonus
            if (volunteer.status === 'available') {
                score += 10;
                reasons.push('Currently available');
            }

            return {
                volunteer,
                score: Math.min(score, 100),
                reasons,
            };
        }).sort((a, b) => b.score - a.score);
    }

    private calculateEfficiencyScore(
        allocations: AllocationRecommendation[],
        dispatches: VolunteerDispatch[]
    ): number {
        const allocationScore = Math.min(allocations.length * 10, 40);
        const dispatchScore = dispatches.length > 0
            ? (dispatches.reduce((sum, d) => sum + d.matchScore, 0) / dispatches.length) * 0.4
            : 0;
        const urgentCoverage = allocations.filter(a => a.priority === 'urgent').length > 0 ? 20 : 0;

        return Math.round(allocationScore + dispatchScore + urgentCoverage);
    }

    private generateStrategicRecommendations(
        allocations: AllocationRecommendation[],
        dispatches: VolunteerDispatch[]
    ): string[] {
        const recommendations: string[] = [];

        if (allocations.filter(a => a.priority === 'urgent').length > 0) {
            recommendations.push('Prioritize urgent resource deployments immediately');
        }

        if (dispatches.length === 0) {
            recommendations.push('No active volunteers available - consider sending alerts');
        }

        const lowMatchDispatches = dispatches.filter(d => d.matchScore < 60);
        if (lowMatchDispatches.length > dispatches.length / 2) {
            recommendations.push('Skill gaps detected - consider targeted training programs');
        }

        if (allocations.length > 5) {
            recommendations.push('High demand detected - pre-position resources in affected areas');
        }

        return recommendations;
    }

    private async safeQuery(sql: string, params: any[]): Promise<any[] | null> {
        try {
            return await this.dataSource.query(sql, params);
        } catch {
            return null;
        }
    }
}
