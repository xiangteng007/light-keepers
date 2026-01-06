import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GeofenceAlertService } from './geofence-alert.service';
import { CreateGeofenceDto, UpdateLocationDto } from './dto/geofence.dto';

@ApiTags('Geofence 地理圍欄')
@Controller('api/geofence')
export class GeofenceAlertController {
    constructor(private readonly geofenceService: GeofenceAlertService) { }

    @Post()
    @ApiOperation({ summary: '建立地理圍欄', description: '建立新的災區或警戒圍欄' })
    @ApiResponse({ status: 201, description: '圍欄建立成功' })
    @ApiBearerAuth()
    createGeofence(@Body() dto: CreateGeofenceDto): any {
        return this.geofenceService.createGeofence(dto);
    }

    @Post('location')
    @ApiOperation({ summary: '更新使用者位置', description: '回報使用者目前位置並檢查圍欄觸發' })
    @ApiResponse({ status: 200, description: '位置更新成功，回傳觸發事件' })
    updateLocation(@Body() dto: UpdateLocationDto): any {
        return this.geofenceService.updateUserLocation(dto.userId, dto.lat, dto.lng);
    }

    @Get('disaster-zones')
    @ApiOperation({ summary: '取得災區圍欄', description: '取得所有啟用中的災區圍欄' })
    getDisasterZones(): any {
        return this.geofenceService.getDisasterZones();
    }

    @Get(':id/users')
    @ApiOperation({ summary: '取得圍欄內使用者', description: '取得特定圍欄內的所有使用者' })
    getUsersInGeofence(@Param('id') id: string): any {
        return this.geofenceService.getUsersInGeofence(id);
    }

    @Get('danger-check')
    @ApiOperation({ summary: '批次檢查危險區', description: '檢查所有使用者是否在危險區域內' })
    checkDangerZones(): any {
        return this.geofenceService.checkUsersInDangerZones();
    }

    @Delete(':id')
    @ApiOperation({ summary: '停用圍欄', description: '停用指定的地理圍欄' })
    deactivateGeofence(@Param('id') id: string): any {
        this.geofenceService.deactivateGeofence(id);
        return { success: true };
    }

    @Post('quick-circle')
    @ApiOperation({ summary: '快速建立圓形圍欄', description: '以中心點和半徑快速建立圓形圍欄' })
    createQuickCircle(
        @Query('name') name: string,
        @Query('lat') lat: number,
        @Query('lng') lng: number,
        @Query('radius') radius: number,
        @Query('type') type: string,
    ): any {
        return this.geofenceService.createQuickCircleZone(name, lat, lng, radius, type);
    }
}
