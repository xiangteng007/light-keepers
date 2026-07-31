/**
 * AI Vision API Controller
 * 提供圖片災情分析、水位估算、損壞評估等 AI 功能
 */

import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../../shared/guards';
import { Throttle } from '@nestjs/throttler';
import { AiClassificationService } from './ai-classification.service';

// 定級理由：現場影像可能拍到受災者、傷患與門牌住址，送入 AI 分析＝把個資交給外部模型；
// 同時每次呼叫都會消耗付費 AI 額度，無門檻等於開放成本濫用管道。
// 回報災情是第一線志工的核心動作 → 單張影像/單筆文字分析 L1；
// `classify/batch`（一次最多 10 筆）屬批次作業，成本與資料量級不同 → L2。
// 限流：20/min（controller 級，等同上傳類——base64 圖片轉發計費的外部 LLM Vision API，
// 為成本濫用主要面）。個別端點可於方法上以 @Throttle 覆寫。
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('ai')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class AiVisionController {
    constructor(private readonly aiService: AiClassificationService) { }

    /**
     * 分析災情圖片 (Base64)
     */
    @Post('vision/analyze')
    async analyzeImage(
        @Body('imageBase64') imageBase64: string,
        @Body('mimeType') mimeType?: string,
        @Body('context') context?: string,
    ) {
        if (!imageBase64) {
            throw new BadRequestException('imageBase64 is required');
        }

        const result = await this.aiService.analyzeDisasterImage(
            imageBase64,
            mimeType || 'image/jpeg',
            context,
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * 分析水位 (Base64)
     */
    @Post('vision/flood-level')
    async analyzeFloodLevel(
        @Body('imageBase64') imageBase64: string,
        @Body('mimeType') mimeType?: string,
        @Body('referenceHeight') referenceHeight?: number,
    ) {
        if (!imageBase64) {
            throw new BadRequestException('imageBase64 is required');
        }

        const result = await this.aiService.analyzeFloodLevel(
            imageBase64,
            mimeType || 'image/jpeg',
            referenceHeight,
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * 損壞程度評估 (Base64)
     */
    @Post('vision/damage-assessment')
    async assessDamage(
        @Body('imageBase64') imageBase64: string,
        @Body('mimeType') mimeType?: string,
        @Body('damageType') damageType?: 'building' | 'road' | 'vehicle' | 'general',
    ) {
        if (!imageBase64) {
            throw new BadRequestException('imageBase64 is required');
        }

        const result = await this.aiService.assessDamage(
            imageBase64,
            mimeType || 'image/jpeg',
            damageType,
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * 文字災情分類
     */
    @Post('classify')
    async classifyText(@Body('description') description: string) {
        if (!description) {
            throw new BadRequestException('description is required');
        }

        const result = await this.aiService.classifyDisasterType(description);

        return {
            success: true,
            data: result,
        };
    }

    /**
     * 批量文字分類
     */
    @Post('classify/batch')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async classifyBatch(@Body('descriptions') descriptions: string[]) {
        if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
            throw new BadRequestException('descriptions array is required');
        }

        if (descriptions.length > 10) {
            throw new BadRequestException('Maximum 10 descriptions per batch');
        }

        const results = await this.aiService.batchClassify(descriptions);

        return {
            success: true,
            data: results,
            count: results.length,
        };
    }
}
