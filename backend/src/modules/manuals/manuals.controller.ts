import { Controller, Get, Query, Param } from '@nestjs/common';
import { ManualsService, AiSearchResponse } from './manuals.service';

@Controller('manuals')
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
