/**
 * Reunification Controller
 * Phase 5.4: 災民協尋 API
 */

import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { SensitiveDataInterceptor } from '../../common/interceptors/sensitive-data.interceptor';
import { ReunificationService } from './reunification.service';
import { MissingPerson, MissingPersonStatus } from './entities';

// 定級理由：失蹤者資料是災難情境中最敏感的個資（姓名、特徵、最後目擊位置、家屬聯絡方式）。
// `search`（憑查詢碼查詢）：查詢碼本身即為持有型憑證，設計上供家屬使用；定為 L1，理由與
//   ncdr-alerts／reports 一致——不由本次任務單方面把它擴大為匿名端點（需先更新
//   docs/policy/public-surface.policy.json）。已知落差：前端 PublicSearchPage 以無認證 fetch 呼叫，
//   且其路徑寫法（/search/{code}）與後端（/search?code=）本就不符，屬既有斷線，一併列為後續項。
// 「管理端 API」原本雖掛了 `UnifiedRolesGuard` 卻**沒有任何 `@RequiredLevel`**——依 UnifiedRolesGuard
//   的實作，未設定等級即直接放行，等於只驗登入。本次補上實際等級：
//   `reports`（新增報案）L2、依任務列出失蹤者／統計 L2（跨人員個資清單）、
//   標記尋獲／團聚 L2（改寫個案狀態，會連動對外通知與家屬期待，屬督導職權）。
// 🔐 F-M2 敏感資料遮罩：失蹤者與報案者的聯絡電話對 L2 幹部遮罩，L3+ 才看得到原文。
@ApiTags('reunification')
@Controller('reunification')
@UseInterceptors(SensitiveDataInterceptor)
export class ReunificationController {
    constructor(private readonly reunificationService: ReunificationService) { }

    // ============ 憑查詢碼查詢 ============
    // 定級 L1（非 L0）：是否真正對外公開屬 public surface 決策，
    // 需先更新 docs/policy/public-surface.policy.json 再放寬（見 AUTHZ_LEVELS_APPLIED_A.md）。

    @Get('search')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: '透過查詢碼查詢' })
    async searchByQueryCode(@Query('code') code: string) {
        return this.reunificationService.findByQueryCode(code);
    }

    // ============ 管理端 API ============
    // 定級原則（管理端 L2-L3，對齊 shelters.controller 的同類災民資料端點）：
    // - 失蹤者名單/統計/報案登錄屬第一線協尋作業 → L2 幹部 (OFFICER)
    // - 標記已團聚 = 個案結案（不可逆的記錄狀態） → L3 常務理事 (DIRECTOR)

    @Post('reports')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '新增失蹤者報案' })
    async createReport(@Body() data: Partial<MissingPerson>) {
        return this.reunificationService.createReport(data);
    }

    @Get('missions/:missionSessionId')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '取得任務的失蹤者列表' })
    @ApiParam({ name: 'missionSessionId' })
    async getByMission(@Param('missionSessionId') missionSessionId: string) {
        return this.reunificationService.getByMission(missionSessionId);
    }

    @Get('missions/:missionSessionId/stats')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '取得統計' })
    @ApiParam({ name: 'missionSessionId' })
    async getStats(@Param('missionSessionId') missionSessionId: string) {
        return this.reunificationService.getStats(missionSessionId);
    }

    @Put(':id/found')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '標記已尋獲' })
    @ApiParam({ name: 'id' })
    async markFound(
        @Param('id') id: string,
        @Body() data: {
            status: MissingPersonStatus;
            foundLocation?: string;
            foundByVolunteerId?: string;
            foundByVolunteerName?: string;
        }
    ) {
        return this.reunificationService.markFound(id, data.status, data);
    }

    @Put(':id/reunited')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 個案結案（不可逆），對齊 shelters 同類端點定 L3
    @ApiBearerAuth()
    @ApiOperation({ summary: '標記已團聚' })
    @ApiParam({ name: 'id' })
    async markReunited(@Param('id') id: string) {
        return this.reunificationService.markReunited(id);
    }
}
