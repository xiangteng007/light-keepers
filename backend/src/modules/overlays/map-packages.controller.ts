import {
    Controller,
    Get,
    Param,
    Query,
    ParseUUIDPipe,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MapPackagesService } from './map-packages.service';
import {
    MapPackageDto,
    PackageRecommendationDto,
    PackageManifestDto,
} from './dto';

@ApiTags('Map Packages')
@Controller('map-packages')
export class MapPackagesController {
    constructor(private readonly packagesService: MapPackagesService) { }

    @Get()
    @ApiOperation({ summary: 'List available map packages' })
    @ApiQuery({ name: 'type', required: false })
    @ApiResponse({ status: 200, type: [MapPackageDto] })
    async list(@Query('type') type?: string): Promise<MapPackageDto[]> {
        return this.packagesService.list(type);
    }

    @Get('recommendations')
    @ApiOperation({ summary: 'Get recommended packages for a session' })
    @ApiQuery({ name: 'sessionId', required: false })
    @ApiResponse({ status: 200, type: [PackageRecommendationDto] })
    async getRecommendations(
        @Query('sessionId') sessionId?: string,
    ): Promise<PackageRecommendationDto[]> {
        return this.packagesService.getRecommendations(sessionId);
    }

    @Get(':id/manifest')
    @ApiOperation({ summary: 'Get package manifest for download' })
    @ApiResponse({ status: 200, type: PackageManifestDto })
    async getManifest(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<PackageManifestDto> {
        const manifest = await this.packagesService.getManifest(id);
        if (!manifest) {
            throw new NotFoundException(`Package ${id} not found`);
        }
        return manifest;
    }
}
