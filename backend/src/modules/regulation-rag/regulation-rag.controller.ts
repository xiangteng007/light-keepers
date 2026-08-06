import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OptionalJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RegulationQaService } from './regulation-qa.service';
import { RegulationCorpusService } from './regulation-corpus.service';
import { AskRegulationDto } from './dto/ask-regulation.dto';
import { RegulationAnswer } from './regulation-rag.types';

/**
 * 台灣災防／戰時動員法規問答。
 *
 * 定級理由：與 manuals 同性質（志工執勤所需的參考資料，唯讀、不含個資），
 * 且戰時動員法規本身即為公開法律，故開放全體登記志工（L1）。
 * 未標 @Public()，匿名仍進不來（全域 GlobalAuthGuard 為 default-deny）。
 */
@Controller('regulations')
@UseGuards(OptionalJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class RegulationRagController {
    constructor(
        private readonly qa: RegulationQaService,
        private readonly corpus: RegulationCorpusService,
    ) {}

    /** 語料狀態與來源清單（含被排除的來源與原因，供稽核） */
    @Get('sources')
    getSources() {
        return {
            success: true,
            data: {
                ready: this.corpus.isReady(),
                attribution: this.corpus.attribution,
                sources: this.corpus.sourceReport,
            },
        };
    }

    @Post('ask')
    async ask(@Body() dto: AskRegulationDto): Promise<{ success: boolean; data: RegulationAnswer }> {
        const data = await this.qa.ask(dto.question, {
            domain: dto.domain,
            region: dto.region,
        });
        return { success: true, data };
    }
}
