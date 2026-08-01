/**
 * Triage Controller
 * Phase 5.1: E-Triage API Endpoints
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { TriageService } from './triage.service';
import { CreateVictimDto, UpdateTriageDto, StartTransportDto, AddMedicalLogDto } from './dto/triage.dto';
import { Request as ExpressRequest } from 'express';

/**
 * CoreJwtGuard 掛在 request 上的使用者物件（見 core-jwt.guard.ts `attachUser`）：
 * 欄位是 `id`/`sub`，**沒有** `userId`。原本宣告成 `userId` 並直接取用，
 * 執行期一律是 undefined —— 傷患的評估者、檢傷改判者、醫療處置執行者
 * 全部沒被記錄到（MCI 的法律留痕要求靠這幾個欄位）。
 */
interface AuthenticatedRequest extends ExpressRequest {
    user: { id: string; sub?: string; email?: string; displayName?: string };
}

@ApiTags('triage')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
// P0 授權定級：檢傷是現場志工的核心動作。定級依據既有兩份既定文件，不另行發明：
//   ① 前端 page-policy 的 `rescue-triage` 頁 requiredLevel = 1
//   ② docs/architecture/MCI_DESIGN.md §「掛牌／改判升色 L1+、降色與站務 L2+」
// 因此整個 controller 定為 L1。降色需 L2+ 確認屬「同一端點內依內容分級」，
// 無法只靠 @RequiredLevel 表達，留待 C2 MCI 實作（M2/M3）在 service 層落實。
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
@Controller('triage')
export class TriageController {
    constructor(private readonly triageService: TriageService) { }

    // ============ Victim CRUD ============

    @Post('victims')
    @ApiOperation({ summary: '建立傷患記錄 (自動 START 評估)' })
    async createVictim(
        @Body() dto: CreateVictimDto,
        @Request() req: AuthenticatedRequest
    ) {
        // 自動填入評估者
        if (!dto.assessorId) {
            dto.assessorId = req.user.id;
            dto.assessorName = req.user.displayName || req.user.email;
        }
        return this.triageService.createVictim(dto);
    }

    @Get('victims/:id')
    @ApiOperation({ summary: '取得傷患詳情' })
    @ApiParam({ name: 'id', description: '傷患 ID' })
    async getVictim(@Param('id') id: string) {
        return this.triageService.getVictim(id);
    }

    @Get('victims/bracelet/:braceletId')
    @ApiOperation({ summary: '透過手環 ID 查詢傷患' })
    @ApiParam({ name: 'braceletId', description: 'NFC/QR 手環 ID' })
    async getVictimByBracelet(@Param('braceletId') braceletId: string) {
        return this.triageService.getVictimByBracelet(braceletId);
    }

    @Get('missions/:missionSessionId/victims')
    @ApiOperation({ summary: '取得任務場次的所有傷患' })
    @ApiParam({ name: 'missionSessionId', description: '任務場次 ID' })
    async getVictimsByMission(@Param('missionSessionId') missionSessionId: string) {
        return this.triageService.getVictimsByMission(missionSessionId);
    }

    // ============ Triage Assessment ============

    @Put('victims/:id/triage')
    @ApiOperation({ summary: '更新檢傷評估' })
    @ApiParam({ name: 'id', description: '傷患 ID' })
    async updateTriage(
        @Param('id') id: string,
        @Body() dto: UpdateTriageDto,
        @Request() req: AuthenticatedRequest
    ) {
        return this.triageService.updateTriage(
            id,
            dto,
            req.user.id,
            req.user.displayName || req.user.email
        );
    }

    // ============ Transport ============

    @Post('victims/:id/transport')
    @ApiOperation({ summary: '開始運送' })
    @ApiParam({ name: 'id', description: '傷患 ID' })
    async startTransport(
        @Param('id') id: string,
        @Body() dto: StartTransportDto
    ) {
        return this.triageService.startTransport(id, dto);
    }

    @Post('victims/:id/arrived')
    @ApiOperation({ summary: '確認到達醫院' })
    @ApiParam({ name: 'id', description: '傷患 ID' })
    async confirmArrival(@Param('id') id: string) {
        return this.triageService.confirmArrival(id);
    }

    // ============ Medical Logs ============

    @Post('victims/:id/logs')
    @ApiOperation({ summary: '新增醫療處置記錄' })
    @ApiParam({ name: 'id', description: '傷患 ID' })
    async addMedicalLog(
        @Param('id') id: string,
        @Body() dto: AddMedicalLogDto,
        @Request() req: AuthenticatedRequest
    ) {
        if (!dto.performerId) {
            dto.performerId = req.user.id;
            dto.performerName = req.user.displayName || req.user.email;
        }
        return this.triageService.addMedicalLog(id, dto);
    }

    @Get('victims/:id/logs')
    @ApiOperation({ summary: '取得傷患的處置記錄' })
    @ApiParam({ name: 'id', description: '傷患 ID' })
    async getMedicalLogs(@Param('id') id: string) {
        return this.triageService.getMedicalLogs(id);
    }

    // ============ Statistics ============

    @Get('missions/:missionSessionId/stats')
    @ApiOperation({ summary: '取得任務場次的檢傷統計' })
    @ApiParam({ name: 'missionSessionId', description: '任務場次 ID' })
    async getStats(@Param('missionSessionId') missionSessionId: string) {
        return this.triageService.getStats(missionSessionId);
    }
}
