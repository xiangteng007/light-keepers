import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { MenuConfigService, MenuConfigItem } from './menu-config.service';
// Use unified guards from SharedAuthModule
import { CoreJwtGuard, CurrentUser as CurrentUserDecorator } from '../shared/guards';
import { JwtPayload } from '../shared/guards/core-jwt.guard';

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
    @UseGuards(CoreJwtGuard)
    async updateAll(
        @Body() dto: UpdateMenuConfigDto,
        @CurrentUserDecorator() user: JwtPayload,
    ) {
        // Only owner (level 5) can update menu config
        if (!user || user.roleLevel < 5) {
            throw new ForbiddenException('只有系統擁有者可以編輯選單設定');
        }

        const updated = await this.menuConfigService.updateAll(dto.items);
        return { data: updated, message: '選單設定已更新' };
    }
}
