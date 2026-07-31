import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ManualsService, AiSearchResponse } from './manuals.service';
import { OptionalJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

/**
 * 實務手冊 Controller
 *
 * 註：原註解寫「公開存取（Level 0）- 匿名訪客可瀏覽」，但全域 GlobalAuthGuard 為 default-deny，
 * OptionalJwtGuard 並無放行匿名的效果，實際上匿名本來就進不來；手冊內容為內部 SOP，
 * 故正式定為登入後可讀而非公開。
 */
@Controller('manuals')
// 定級理由：SOP 實務手冊全為唯讀且是志工執勤必需，開放全體登記志工（L1）；內容屬內部文件，不列入公開面（未標 @Public()）。
@UseGuards(OptionalJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class ManualsController {
    constructor(private readonly manualsService: ManualsService) { }

    // 取得所有手冊
    @Get()
    getAllManuals() {
        return {
            success: true,
            data: this.manualsService.getAllManuals(),
        };
    }

    // AI 語意搜尋
    @Get('search')
    async searchManuals(@Query('q') query: string): Promise<{ success: boolean; data: AiSearchResponse }> {
        if (!query || query.trim().length === 0) {
            return {
                success: true,
                data: {
                    query: '',
                    results: [],
                    processingTime: 0,
                },
            };
        }

        const result = await this.manualsService.searchWithAI(query);
        return {
            success: true,
            data: result,
        };
    }

    // 取得單一手冊
    @Get(':id')
    getManualById(@Param('id') id: string) {
        const manual = this.manualsService.getManualById(id);
        if (!manual) {
            return {
                success: false,
                message: 'Manual not found',
            };
        }
        return {
            success: true,
            data: manual,
        };
    }
}
