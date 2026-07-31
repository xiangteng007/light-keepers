import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
// Use CoreJwtGuard from SharedAuthModule - doesn't require AccountRepository
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { SkillService, CreateSkillDto, UpdateSkillDto } from './entities/skill.service';
import { VehicleService, CreateVehicleDto, UpdateVehicleDto } from './entities/vehicle.service';
import { InsuranceService, CreateInsuranceDto, UpdateInsuranceDto } from './entities/insurance.service';
import { PointsService, CreatePointsRecordDto } from './entities/points.service';

// ========== Skills Controller ==========
// 定級理由：技能主檔。志工需查閱技能清單以填寫個人專長（讀 L1）；主檔異動屬組織治理（寫 L3）；
// 批次種子資料會覆寫全站主檔，屬破壞性操作（L4）。class 基準取保守值 L3，讀取端點個別放寬。
@Controller('skills')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.DIRECTOR)
export class SkillsController {
    constructor(private readonly skillService: SkillService) { }

    @Get()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findAll(@Query('activeOnly') activeOnly?: string) {
        return this.skillService.findAll(activeOnly !== 'false');
    }

    @Get('categories')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getCategories() {
        return this.skillService.getCategories();
    }

    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findOne(@Param('id') id: string) {
        return this.skillService.findOne(id);
    }

    @Post()
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async create(@Body() dto: CreateSkillDto) {
        return this.skillService.create(dto);
    }

    @Patch(':id')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
        return this.skillService.update(id, dto);
    }

    @Post('seed')
    @RequiredLevel(ROLE_LEVELS.CHAIRMAN)
    async seedSkills() {
        await this.skillService.seedDefaultSkills();
        return { success: true, message: 'Skills seeded' };
    }
}

// ========== Vehicles Controller ==========
// 定級理由：志工自有車輛（含車牌、保單號碼等個資）。前台 /my-vehicles 為 L1 自助頁面，
// 單筆增改停用皆屬「維護本人車籍」→ L1；`expiring` 為跨人員批次個資清單（保險到期名單）→ L2。
// 殘留風險：service 層無擁有者比對，L1 仍可操作他人車籍（IDOR），須另案導入 ResourceOwnerGuard。
@Controller('vehicles')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class VehiclesController {
    constructor(private readonly vehicleService: VehicleService) { }

    @Get('volunteer/:volunteerId')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.vehicleService.findByVolunteer(volunteerId);
    }

    @Get('types')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getVehicleTypes() {
        return this.vehicleService.getVehicleTypes();
    }

    @Get('purposes')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getVehiclePurposes() {
        return this.vehicleService.getVehiclePurposes();
    }

    @Get('expiring')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getExpiringInsurance(@Query('days') days?: string) {
        return this.vehicleService.getExpiringInsurance(days ? parseInt(days) : 30);
    }

    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findOne(@Param('id') id: string) {
        return this.vehicleService.findOne(id);
    }

    @Post()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async create(@Body() dto: CreateVehicleDto) {
        return this.vehicleService.create(dto);
    }

    @Patch(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
        return this.vehicleService.update(id, dto);
    }

    @Delete(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async deactivate(@Param('id') id: string) {
        return this.vehicleService.deactivate(id);
    }
}

// ========== Insurance Controller ==========
// 定級理由：志工保險資料（保單號碼、保額）。前台 /my-insurance 為 L1 自助頁面，
// 本人保單維護與派工前的承保檢核屬第一線需求 → L1；`expiring` 為跨人員到期名單（批次個資）→ L2。
// 殘留風險同 Vehicles：無擁有者比對，須另案導入 ResourceOwnerGuard。
@Controller('insurance')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class InsuranceController {
    constructor(private readonly insuranceService: InsuranceService) { }

    @Get('volunteer/:volunteerId')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.insuranceService.findByVolunteer(volunteerId);
    }

    @Get('volunteer/:volunteerId/active')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findActiveByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.insuranceService.findActiveByVolunteer(volunteerId);
    }

    @Get('types')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getInsuranceTypes() {
        return this.insuranceService.getInsuranceTypes();
    }

    @Get('expiring')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getExpiring(@Query('days') days?: string) {
        return this.insuranceService.getExpiring(days ? parseInt(days) : 30);
    }

    @Post('check-coverage')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async checkCoverage(@Body() body: { volunteerId: string; taskType?: string }) {
        return this.insuranceService.checkCoverage(body.volunteerId, body.taskType);
    }

    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findOne(@Param('id') id: string) {
        return this.insuranceService.findOne(id);
    }

    @Post()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async create(@Body() dto: CreateInsuranceDto) {
        return this.insuranceService.create(dto);
    }

    @Patch(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async update(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
        return this.insuranceService.update(id, dto);
    }

    @Delete(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async deactivate(@Param('id') id: string) {
        return this.insuranceService.deactivate(id);
    }
}

// ========== Points Controller ==========
// 定級理由：志工積分＝時數與獎勵憑據，具「準財務」性質。查閱本人積分為 L1 自助（前台 /my-points）；
// 代他人登錄任務/訓練積分屬督導職權 → L2；`adjust` 為人工加減分（舞弊風險最高）→ L3；
// `export` 為跨人員積分批次匯出（個資批次讀取）→ L3。class 基準取 L2。
@Controller('points')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class PointsController {
    constructor(private readonly pointsService: PointsService) { }

    @Get('volunteer/:volunteerId')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        return this.pointsService.findByVolunteer(volunteerId);
    }

    @Get('volunteer/:volunteerId/summary')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getVolunteerSummary(@Param('volunteerId') volunteerId: string) {
        return this.pointsService.getVolunteerSummary(volunteerId);
    }

    @Get('volunteer/:volunteerId/yearly/:year')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getYearlySummary(
        @Param('volunteerId') volunteerId: string,
        @Param('year') year: string,
    ) {
        return this.pointsService.getYearlySummary(volunteerId, parseInt(year));
    }

    @Post('record')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async createRecord(@Body() dto: CreatePointsRecordDto) {
        return this.pointsService.create(dto);
    }

    @Post('task')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
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
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
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

// 定級理由：出勤簽到退屬「本人出勤資料」→ L1（第一線志工必須能自行簽到退並查看自己狀態）；
// `active` 為全域在勤名單（跨人員即時位置/狀態，營運讀取）→ L2；
// `cancelCheckIn` 為代他人撤銷出勤紀錄（影響時數與保險認定）→ L2。
@Controller('checkin')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) { }

    @Post()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async checkIn(@Body() dto: CheckInDto) {
        return this.checkInService.checkIn(dto);
    }

    @Post('out')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async checkOut(@Body() dto: CheckOutDto) {
        return this.checkInService.checkOut(dto);
    }

    @Get('status/:volunteerId')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getStatus(
        @Param('volunteerId') volunteerId: string,
        @Query('taskId') taskId?: string,
    ) {
        return this.checkInService.getCheckInStatus(volunteerId, taskId);
    }

    @Get('active')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getActiveCheckIns() {
        return this.checkInService.getActiveCheckIns();
    }

    @Delete(':volunteerId')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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

// 定級理由：到期提醒彙整跨人員的證照/保險到期資料（批次個資讀取）→ L2；
// 查詢本人到期項目為自助 → L1；`send-line` 會對全體志工實際發出 LINE 推播（對外副作用、不可回收）→ L3。
@Controller('expiry-notifications')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class ExpiryNotificationController {
    constructor(private readonly expiryService: ExpiryNotificationService) { }

    @Get()
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getExpiringItems(@Query('days') days?: string) {
        return this.expiryService.getExpiringItems(days ? parseInt(days) : 30);
    }

    @Get('volunteer/:volunteerId')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getTodayNotifications() {
        return this.expiryService.getTodayNotifications();
    }

    @Post('send-line')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async sendLineNotifications() {
        return this.expiryService.sendLineNotifications();
    }
}

