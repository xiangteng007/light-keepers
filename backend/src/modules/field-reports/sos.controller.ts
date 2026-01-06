import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinLevel } from '../auth/guards/roles.guard';
import { RoleLevel } from '../accounts/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SosService } from './sos.service';
import { CreateSosDto, AckSosDto, ResolveSosDto } from './dto';

@ApiTags('SOS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SosController {
    constructor(private readonly service: SosService) { }

    @Post('mission-sessions/:missionSessionId/sos')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Trigger SOS signal' })
    async trigger(
        @Param('missionSessionId') missionSessionId: string,
        @Body() dto: CreateSosDto,
        @CurrentUser() user: any,
    ) {
        return this.service.trigger(missionSessionId, dto, user);
    }

    @Post('sos/:sosId/ack')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Acknowledge SOS signal' })
    async ack(
        @Param('sosId') sosId: string,
        @Body() dto: AckSosDto,
        @CurrentUser() user: any,
    ) {
        return this.service.ack(sosId, dto, user);
    }

    @Post('sos/:sosId/resolve')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Resolve SOS signal' })
    async resolve(
        @Param('sosId') sosId: string,
        @Body() dto: ResolveSosDto,
        @CurrentUser() user: any,
    ) {
        return this.service.resolve(sosId, dto, user);
    }

    @Get('mission-sessions/:missionSessionId/sos/active')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Get active SOS signals' })
    async getActive(
        @Param('missionSessionId') missionSessionId: string,
    ) {
        return this.service.findActive(missionSessionId);
    }
}
