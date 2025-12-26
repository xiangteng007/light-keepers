import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { MenuConfigService, MenuConfigItem } from './menu-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface UpdateMenuConfigDto {
    items: MenuConfigItem[];
}

@Controller('menu-config')
export class MenuConfigController {
    constructor(private readonly menuConfigService: MenuConfigService) { }

    @Get()
    async getAll() {
        const configs = await this.menuConfigService.getAll();
        return { data: configs };
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    async updateAll(
        @Body() dto: UpdateMenuConfigDto,
        @CurrentUser() user: any,
    ) {
        // Only owner (level 5) can update menu config
        if (!user || user.roleLevel < 5) {
            throw new ForbiddenException('只有系統擁有者可以編輯選單設定');
        }

        const updated = await this.menuConfigService.updateAll(dto.items);
        return { data: updated, message: '選單設定已更新' };
    }
}
