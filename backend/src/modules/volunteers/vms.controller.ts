import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
// Use SimpleJwtGuard from SharedJwtModule - doesn't require AccountRepository
import { SimpleJwtGuard } from '../shared/simple-jwt.guard';
import { SkillService, CreateSkillDto, UpdateSkillDto } from './entities/skill.service';
import { VehicleService, CreateVehicleDto, UpdateVehicleDto } from './entities/vehicle.service';
import { InsuranceService, CreateInsuranceDto, UpdateInsuranceDto } from './entities/insurance.service';
import { PointsService, CreatePointsRecordDto } from './entities/points.service';

// ========== Skills Controller ==========
@Controller('skills')
@UseGuards(SimpleJwtGuard)
export class SkillsController {
    constructor(private readonly skillService: SkillService) { }

    @Get()
    async findAll(@Query('activeOnly') activeOnly?: string) {
        return this.skillService.findAll(activeOnly !== 'false');
    }

    @Get('categories')
    getCategories() {
        return this.skillService.getCategories();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.skillService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateSkillDto) {
        return this.skillService.create(dto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
        return this.skillService.update(id, dto);
    }

    @Post('seed')
    async seedSkills() {
        await this.skillService.seedDefaultSkills();
        return { success: true, message: 'Skills seeded' };
    }
}

// ========== Vehicles Controller ==========
@Controller('vehicles')
@UseGuards(SimpleJwtGuard)
export class VehiclesController {
    constructor(private readonly vehicleService: VehicleService) { }

    @Get('volunteer/:volunteerId')
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.vehicleService.findByVolunteer(volunteerId);
    }

    @Get('types')
    getVehicleTypes() {
        return this.vehicleService.getVehicleTypes();
    }

    @Get('purposes')
    getVehiclePurposes() {
        return this.vehicleService.getVehiclePurposes();
    }

    @Get('expiring')
    async getExpiringInsurance(@Query('days') days?: string) {
        return this.vehicleService.getExpiringInsurance(days ? parseInt(days) : 30);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.vehicleService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateVehicleDto) {
        return this.vehicleService.create(dto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
        return this.vehicleService.update(id, dto);
    }

    @Delete(':id')
    async deactivate(@Param('id') id: string) {
        return this.vehicleService.deactivate(id);
    }
}

// ========== Insurance Controller ==========
@Controller('insurance')
@UseGuards(SimpleJwtGuard)
export class InsuranceController {
    constructor(private readonly insuranceService: InsuranceService) { }

    @Get('volunteer/:volunteerId')
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.insuranceService.findByVolunteer(volunteerId);
    }

    @Get('volunteer/:volunteerId/active')
    async findActiveByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.insuranceService.findActiveByVolunteer(volunteerId);
    }

    @Get('types')
    getInsuranceTypes() {
        return this.insuranceService.getInsuranceTypes();
    }

    @Get('expiring')
    async getExpiring(@Query('days') days?: string) {
        return this.insuranceService.getExpiring(days ? parseInt(days) : 30);
    }

    @Post('check-coverage')
    async checkCoverage(@Body() body: { volunteerId: string; taskType?: string }) {
        return this.insuranceService.checkCoverage(body.volunteerId, body.taskType);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.insuranceService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateInsuranceDto) {
        return this.insuranceService.create(dto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
        return this.insuranceService.update(id, dto);
    }

    @Delete(':id')
    async deactivate(@Param('id') id: string) {
        return this.insuranceService.deactivate(id);
    }
}

// ========== Points Controller ==========
@Controller('points')
@UseGuards(SimpleJwtGuard)
export class PointsController {
    constructor(private readonly pointsService: PointsService) { }

    @Get('volunteer/:volunteerId')
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.pointsService.findByVolunteer(volunteerId);
    }

    @Get('volunteer/:volunteerId/summary')
    async getVolunteerSummary(@Param('volunteerId') volunteerId: string) {
        return this.pointsService.getVolunteerSummary(volunteerId);
    }

    @Get('volunteer/:volunteerId/yearly/:year')
    async getYearlySummary(
        @Param('volunteerId') volunteerId: string,
        @Param('year') year: string,
    ) {
        return this.pointsService.getYearlySummary(volunteerId, parseInt(year));
    }

    @Post('record')
    async createRecord(@Body() dto: CreatePointsRecordDto) {
        return this.pointsService.create(dto);
    }

    @Post('task')
    async recordTaskPoints(@Body() body: {
        volunteerId: string;
        taskId: string;
        hours: number;
        isNight?: boolean;
        isHighRisk?: boolean;
        description?: string;
        recordedBy?: string;
    }) {
        return this.pointsService.recordTaskPoints(
            body.volunteerId,
            body.taskId,
            body.hours,
            {
                isNight: body.isNight,
                isHighRisk: body.isHighRisk,
                description: body.description,
                recordedBy: body.recordedBy,
            }
        );
    }

    @Post('training')
    async recordTrainingPoints(@Body() body: {
        volunteerId: string;
        hours: number;
        description: string;
        recordedBy?: string;
    }) {
        return this.pointsService.recordTrainingPoints(
            body.volunteerId,
            body.hours,
            body.description,
            body.recordedBy,
        );
    }

    @Post('adjust')
    async adjustPoints(@Body() body: {
        volunteerId: string;
        points: number;
        description: string;
        recordedBy: string;
    }) {
        return this.pointsService.adjustPoints(
            body.volunteerId,
            body.points,
            body.description,
            body.recordedBy,
        );
    }

    @Get('export')
    async exportReport(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.pointsService.exportReport(
            new Date(startDate),
            new Date(endDate),
        );
    }
}

// ========== Check-In Controller ==========
import { CheckInService, CheckInDto, CheckOutDto } from './entities/checkin.service';

@Controller('checkin')
@UseGuards(SimpleJwtGuard)
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) { }

    @Post()
    async checkIn(@Body() dto: CheckInDto) {
        return this.checkInService.checkIn(dto);
    }

    @Post('out')
    async checkOut(@Body() dto: CheckOutDto) {
        return this.checkInService.checkOut(dto);
    }

    @Get('status/:volunteerId')
    async getStatus(
        @Param('volunteerId') volunteerId: string,
        @Query('taskId') taskId?: string,
    ) {
        return this.checkInService.getCheckInStatus(volunteerId, taskId);
    }

    @Get('active')
    async getActiveCheckIns() {
        return this.checkInService.getActiveCheckIns();
    }

    @Delete(':volunteerId')
    async cancelCheckIn(
        @Param('volunteerId') volunteerId: string,
        @Query('taskId') taskId?: string,
    ) {
        await this.checkInService.cancelCheckIn(volunteerId, taskId);
        return { success: true };
    }
}

// ========== Expiry Notifications Controller ==========
import { ExpiryNotificationService } from './entities/expiry-notification.service';

@Controller('expiry-notifications')
@UseGuards(SimpleJwtGuard)
export class ExpiryNotificationController {
    constructor(private readonly expiryService: ExpiryNotificationService) { }

    @Get()
    async getExpiringItems(@Query('days') days?: string) {
        return this.expiryService.getExpiringItems(days ? parseInt(days) : 30);
    }

    @Get('volunteer/:volunteerId')
    async getExpiringItemsForVolunteer(
        @Param('volunteerId') volunteerId: string,
        @Query('days') days?: string,
    ) {
        return this.expiryService.getExpiringItemsForVolunteer(
            volunteerId,
            days ? parseInt(days) : 30,
        );
    }

    @Get('today')
    async getTodayNotifications() {
        return this.expiryService.getTodayNotifications();
    }

    @Post('send-line')
    async sendLineNotifications() {
        return this.expiryService.sendLineNotifications();
    }
}

