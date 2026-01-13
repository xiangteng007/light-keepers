/**
 * AI Controller
 * 
 * Endpoints for AI-powered dispatch and forecasting
 * v1.0
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { DispatcherAgentService } from './services/dispatcher-agent.service';
import { ForecasterAgentService } from './services/forecaster-agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI Agents')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
    constructor(
        private readonly dispatcherAgent: DispatcherAgentService,
        private readonly forecasterAgent: ForecasterAgentService,
    ) { }

    // ===== Dispatcher Agent =====

    @Post('dispatch/suggest')
    @ApiOperation({ summary: 'Get AI-powered dispatch suggestions for a task' })
    async getDispatchSuggestions(@Body() body: {
        taskId: string;
        taskType: string;
        location: string;
        requiredSkills: string[];
        urgency: string;
        estimatedDuration: number;
        availableVolunteers: {
            id: string;
            name: string;
            skills: string[];
            location: string;
            hoursWorkedToday: number;
            lastAssignment: string;
        }[];
    }) {
        const suggestions = await this.dispatcherAgent.getSuggestions(
            {
                taskId: body.taskId,
                taskType: body.taskType,
                location: body.location,
                requiredSkills: body.requiredSkills,
                urgency: body.urgency,
                estimatedDuration: body.estimatedDuration,
            },
            body.availableVolunteers
        );

        return {
            success: true,
            data: suggestions,
        };
    }

    @Post('dispatch/fatigue-check')
    @ApiOperation({ summary: 'Check fatigue levels for volunteers' })
    async checkFatigue(@Body() body: {
        volunteers: {
            id: string;
            name: string;
            hoursWorkedToday: number;
            hoursWorkedWeek: number;
            lastRestPeriod: string;
        }[];
    }) {
        const alerts = await this.dispatcherAgent.checkFatigue(
            body.volunteers.map(v => ({
                ...v,
                lastRestPeriod: new Date(v.lastRestPeriod),
            }))
        );

        return {
            success: true,
            data: {
                alerts,
                summary: {
                    total: body.volunteers.length,
                    criticalCount: alerts.filter(a => a.alertLevel === 'critical').length,
                    warningCount: alerts.filter(a => a.alertLevel === 'warning').length,
                },
            },
        };
    }

    @Post('dispatch/triage')
    @ApiOperation({ summary: 'Perform START triage assessment' })
    async assessTriage(@Body() body: {
        patients: {
            id: string;
            canWalk: boolean;
            isBreathing: boolean;
            respiratoryRate?: number;
            capillaryRefill?: number;
            canFollowCommands: boolean;
            description?: string;
        }[];
    }) {
        const results = await this.dispatcherAgent.assessTriage(body.patients);

        return {
            success: true,
            data: {
                results,
                summary: {
                    immediate: results.filter(r => r.category === 'immediate').length,
                    delayed: results.filter(r => r.category === 'delayed').length,
                    minor: results.filter(r => r.category === 'minor').length,
                    deceased: results.filter(r => r.category === 'deceased').length,
                },
            },
        };
    }

    // ===== Forecaster Agent =====

    @Post('forecast/demand')
    @ApiOperation({ summary: 'Forecast resource demand' })
    async forecastDemand(@Body() body: {
        resourceTypes: string[];
        currentInventory: Record<string, number>;
        historicalUsage: Record<string, number[]>;
        activeIncidents: number;
        weatherConditions?: string;
    }) {
        const forecasts = await this.forecasterAgent.forecastDemand(body);

        return {
            success: true,
            data: forecasts,
        };
    }

    @Post('forecast/gaps')
    @ApiOperation({ summary: 'Analyze resource gaps' })
    async analyzeGaps(@Body() body: {
        inventory: { type: string; category: string; quantity: number; minimum: number }[];
    }) {
        const gaps = await this.forecasterAgent.analyzeGaps(body);

        return {
            success: true,
            data: {
                gaps,
                summary: {
                    criticalCount: gaps.filter(g => g.severity === 'critical').length,
                    warningCount: gaps.filter(g => g.severity === 'warning').length,
                    okCount: gaps.filter(g => g.severity === 'ok').length,
                },
            },
        };
    }

    @Post('forecast/scenario')
    @ApiOperation({ summary: 'Predict supplies needed for disaster scenario' })
    async predictScenario(@Body() body: {
        disasterType: 'earthquake' | 'flood' | 'typhoon' | 'fire' | 'other';
        magnitude: 'small' | 'medium' | 'large' | 'catastrophic';
        affectedPopulation: number;
        duration: number;
        location: string;
    }) {
        const prediction = await this.forecasterAgent.predictForScenario(body);

        return {
            success: true,
            data: prediction,
        };
    }

    @Post('forecast/match')
    @ApiOperation({ summary: 'Match available resources to requirements' })
    async matchResources(@Body() body: {
        required: { type: string; quantity: number }[];
        available: { type: string; quantity: number; location: string }[];
        targetLocation: string;
    }) {
        const result = await this.forecasterAgent.matchResources(body);

        return {
            success: true,
            data: result,
        };
    }
}
