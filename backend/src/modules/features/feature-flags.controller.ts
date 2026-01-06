/**
 * Feature Flags Controller
 * REST API for feature flag management
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FeatureFlagsService, FeatureFlag, UserContext } from './feature-flags.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS, CurrentUser } from '../shared/guards';

class CreateFlagDto {
    key: string;
    name: string;
    description?: string;
    enabled?: boolean;
    rolloutPercentage?: number;
    allowedRoles?: string[];
    allowedUsers?: string[];
    blockedUsers?: string[];
    variants?: Array<{
        id: string;
        name: string;
        weight: number;
        config?: Record<string, any>;
    }>;
    expiresAt?: string;
}

@Controller('features')
export class FeatureFlagsController {
    constructor(private featureFlagsService: FeatureFlagsService) { }

    /**
     * Get all feature flags (admin)
     */
    @Get()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getAllFlags() {
        const flags = await this.featureFlagsService.getAllFlags();
        return { success: true, data: flags };
    }

    /**
     * Create a new feature flag
     */
    @Post()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async createFlag(@Body() dto: CreateFlagDto) {
        const flag = await this.featureFlagsService.createFlag({
            key: dto.key,
            name: dto.name,
            description: dto.description,
            enabled: dto.enabled ?? false,
            rolloutPercentage: dto.rolloutPercentage ?? 100,
            allowedRoles: dto.allowedRoles,
            allowedUsers: dto.allowedUsers,
            blockedUsers: dto.blockedUsers,
            variants: dto.variants,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        });
        return { success: true, data: flag };
    }

    /**
     * Get flag by key
     */
    @Get(':key')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getFlag(@Param('key') key: string) {
        const flag = await this.featureFlagsService.getFlag(key);
        if (!flag) {
            return { success: false, error: 'Flag not found' };
        }
        return { success: true, data: flag };
    }

    /**
     * Update a flag
     */
    @Put(':key')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async updateFlag(@Param('key') key: string, @Body() dto: Partial<CreateFlagDto>) {
        const flag = await this.featureFlagsService.updateFlag(key, dto as Partial<FeatureFlag>);
        if (!flag) {
            return { success: false, error: 'Flag not found' };
        }
        return { success: true, data: flag };
    }

    /**
     * Delete a flag
     */
    @Delete(':key')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async deleteFlag(@Param('key') key: string) {
        const deleted = await this.featureFlagsService.deleteFlag(key);
        return { success: deleted };
    }

    /**
     * Evaluate flags for current user
     */
    @Get('evaluate/all')
    @UseGuards(CoreJwtGuard)
    async evaluateAll(@CurrentUser() user: any) {
        const context: UserContext = {
            userId: user?.uid || user?.id,
            role: user?.role,
        };
        const evaluations = await this.featureFlagsService.evaluateAll(context);
        return { success: true, data: evaluations };
    }

    /**
     * Evaluate a single flag
     */
    @Get('evaluate/:key')
    @UseGuards(CoreJwtGuard)
    async evaluateFlag(@Param('key') key: string, @CurrentUser() user: any) {
        const context: UserContext = {
            userId: user?.uid || user?.id,
            role: user?.role,
        };
        const result = await this.featureFlagsService.evaluate(key, context);
        return { success: true, data: result };
    }

    /**
     * Get enabled features for current user (client-side)
     */
    @Get('client/enabled')
    @UseGuards(CoreJwtGuard)
    async getEnabledFeatures(@CurrentUser() user: any) {
        const context: UserContext = {
            userId: user?.uid || user?.id,
            role: user?.role,
        };
        const features = await this.featureFlagsService.getEnabledFeatures(context);
        return { success: true, data: features };
    }
}
