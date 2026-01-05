import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteersController } from './volunteers.controller';
import { VolunteersAdminController } from './volunteers-admin.controller';
import { VolunteersService } from './volunteers.service';
import { Volunteer } from './volunteers.entity';
import { VolunteerAssignment } from './volunteer-assignments.entity';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

// VMS Entities
import { Skill } from './entities/skill.entity';
import { VolunteerSkill } from './entities/volunteer-skill.entity';
import { VolunteerCertificate } from './entities/volunteer-certificate.entity';
import { VolunteerVehicle } from './entities/volunteer-vehicle.entity';
import { VolunteerInsurance } from './entities/volunteer-insurance.entity';
import { PointsRecord } from './entities/points-record.entity';

// Recognition Entities
import { VolunteerBadge, VolunteerEarnedBadge, VolunteerRecognition } from './entities/recognition.entity';

// VMS Services
import { SkillService } from './entities/skill.service';
import { VehicleService } from './entities/vehicle.service';
import { InsuranceService } from './entities/insurance.service';
import { PointsService } from './entities/points.service';
import { CheckInService } from './entities/checkin.service';
import { ExpiryNotificationService } from './entities/expiry-notification.service';
import { RecognitionService } from './entities/recognition.service';

// VMS Controllers
import {
    SkillsController, VehiclesController, InsuranceController, PointsController,
    CheckInController, ExpiryNotificationController
} from './vms.controller';

// Recognition Controller
import { RecognitionController } from './recognition.controller';

// Location tracking
import { VolunteerLocationController } from './volunteer-location.controller';

// Shared JWT Module (breaks circular dependency with AuthModule)
import { SharedJwtModule } from '../shared/shared-jwt.module';

// Import AccountsModule for permission sync
import { AccountsModule } from '../accounts/accounts.module';

// Import AccessLogModule for audit logging
import { AccessLogModule } from '../access-log/access-log.module';

@Module({
    imports: [
        SharedJwtModule, // Provides JwtAuthGuard without full AuthModule dependencies
        AccountsModule,  // ✅ Provides AccountsService for permission sync
        AccessLogModule, // ✅ Provides AccessLogService for audit logging
        TypeOrmModule.forFeature([
            // Core entities
            Volunteer,
            VolunteerAssignment,
            // VMS entities
            Skill,
            VolunteerSkill,
            VolunteerCertificate,
            VolunteerVehicle,
            VolunteerInsurance,
            PointsRecord,
            // Recognition entities
            VolunteerBadge,
            VolunteerEarnedBadge,
            VolunteerRecognition,
        ]),
    ],
    controllers: [
        VolunteersController,
        VolunteersAdminController,
        AssignmentsController,
        // VMS Controllers
        SkillsController,
        VehiclesController,
        InsuranceController,
        PointsController,
        CheckInController,
        ExpiryNotificationController,
        // Recognition Controller
        RecognitionController,
        // Location tracking
        VolunteerLocationController,
    ],
    providers: [
        VolunteersService,
        AssignmentsService,
        // VMS Services
        SkillService,
        VehicleService,
        InsuranceService,
        PointsService,
        CheckInService,
        ExpiryNotificationService,
        // Recognition Service
        RecognitionService,
    ],
    exports: [
        VolunteersService,
        AssignmentsService,
        SkillService,
        VehicleService,
        InsuranceService,
        PointsService,
        RecognitionService,
    ],
})
export class VolunteersModule { }

