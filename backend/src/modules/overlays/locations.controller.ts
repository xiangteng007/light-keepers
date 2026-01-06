import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, MinLevel } from '../auth/guards';
import { RoleLevel } from '../accounts/entities/role.entity';
import { LocationsService } from './locations.service';
import {
    LocationDto,
    SearchLocationsDto,
    GetLocationChangesDto,
    ImportLocationsDto,
} from './dto';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get('search')
    @MinLevel(RoleLevel.VOLUNTEER) // Level 1+
    @ApiOperation({ summary: 'Search locations by name/address with optional bbox' })
    @ApiResponse({ status: 200, type: [LocationDto] })
    async search(@Query() query: SearchLocationsDto): Promise<LocationDto[]> {
        return this.locationsService.search(query);
    }

    @Get('changes')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Get location changes since timestamp' })
    @ApiResponse({ status: 200, type: [LocationDto] })
    async getChanges(@Query() query: GetLocationChangesDto): Promise<LocationDto[]> {
        return this.locationsService.getChanges(query);
    }

    @Post('import')
    @MinLevel(RoleLevel.DIRECTOR) // Level 3+
    @ApiOperation({ summary: 'Import locations from external source' })
    @ApiResponse({ status: 201, description: 'Import count' })
    async import(@Body() dto: ImportLocationsDto): Promise<{ count: number }> {
        return this.locationsService.import(dto);
    }
}
