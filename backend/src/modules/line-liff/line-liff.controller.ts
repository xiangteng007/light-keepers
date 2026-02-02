/**
 * line-liff.controller.ts
 * 
 * REST API Controller for LINE LIFF Integration
 * Provides endpoints for LINE mini-app configuration and messaging
 */
import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LineLiffService } from './line-liff.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { Public } from '../shared/guards/public.decorator';

@ApiTags('LINE LIFF Integration')
@Controller('line-liff')
export class LineLiffController {
    constructor(private readonly lineLiffService: LineLiffService) {}

    /**
     * 取得 LIFF 初始化設定 (公開端點)
     * 前端使用: liff.init({ liffId: config.liffId })
     */
    @Get('config')
    @Public()
    @ApiOperation({ summary: '取得 LIFF 設定', description: '公開端點，供前端初始化 LIFF SDK' })
    getLiffConfig() {
        return this.lineLiffService.getLiffConfig();
    }

    /**
     * 取得預設 Rich Menu 結構
     */
    @Get('rich-menu/default')
    @ApiBearerAuth()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: '取得預設 Rich Menu', description: '取得一般模式的 Rich Menu 結構' })
    getDefaultRichMenu() {
        return this.lineLiffService.buildDefaultRichMenu();
    }

    /**
     * 取得緊急 Rich Menu 結構
     */
    @Get('rich-menu/emergency')
    @ApiBearerAuth()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: '取得緊急 Rich Menu', description: '取得緊急模式的 Rich Menu 結構' })
    getEmergencyRichMenu() {
        return this.lineLiffService.buildEmergencyRichMenu();
    }

    /**
     * 建立災情警報 Flex Message
     */
    @Post('flex/alert')
    @ApiBearerAuth()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '建立災情警報訊息', description: '產生災情警報 Flex Message JSON' })
    buildAlertFlexMessage(
        @Body() alertData: {
            id: string;
            type: string;
            title: string;
            description: string;
            severity: 'red' | 'orange' | 'yellow' | 'green';
            affectedArea: string;
            issuedAt?: Date;
        },
    ) {
        return this.lineLiffService.buildAlertFlexMessage({
            ...alertData,
            issuedAt: alertData.issuedAt ? new Date(alertData.issuedAt) : new Date(),
        });
    }

    /**
     * 建立災情回報確認 Flex Message
     */
    @Post('flex/report-confirm')
    @ApiBearerAuth()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '建立回報確認訊息', description: '產生災情回報確認 Flex Message JSON' })
    buildReportConfirmFlexMessage(
        @Body() reportData: {
            id: string;
            caseNumber: string;
            type: string;
            description: string;
        },
    ) {
        return this.lineLiffService.buildReportConfirmFlexMessage(reportData);
    }

    /**
     * 建立避難所卡片 Carousel
     */
    @Post('flex/shelters')
    @ApiBearerAuth()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '建立避難所卡片', description: '產生避難所 Carousel Flex Message' })
    buildShelterCarousel(
        @Body() shelters: Array<{
            id: string;
            name: string;
            address: string;
            lat: number;
            lng: number;
            distance: number;
            capacity: number;
            currentOccupancy: number;
        }>,
    ) {
        return this.lineLiffService.buildShelterCarousel(shelters);
    }

    /**
     * 建立志工簽到成功 Flex Message
     */
    @Post('flex/checkin-success')
    @ApiBearerAuth()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: '建立簽到成功訊息', description: '產生志工簽到成功 Flex Message' })
    buildCheckinSuccessFlexMessage(
        @Body() checkinData: {
            volunteerName: string;
            location: string;
            checkinTime?: Date;
        },
    ) {
        return this.lineLiffService.buildCheckinSuccessFlexMessage({
            ...checkinData,
            checkinTime: checkinData.checkinTime ? new Date(checkinData.checkinTime) : new Date(),
        });
    }
}
