import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteersController } from './volunteers.controller';
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

// VMS Services
import { SkillService } from './entities/skill.service';
import { VehicleService } from './entities/vehicle.service';
import { InsuranceService } from './entities/insurance.service';
import { PointsService } from './entities/points.service';

// VMS Controllers
import { SkillsController, VehiclesController, InsuranceController, PointsController } from './vms.controller';

@Module({
    imports: [
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
        ]),
    ],
    controllers: [
        VolunteersController,
        AssignmentsController,
        // VMS Controllers
        SkillsController,
        VehiclesController,
        InsuranceController,
        PointsController,
    ],
    providers: [
        VolunteersService,
        AssignmentsService,
        // VMS Services
        SkillService,
        VehicleService,
        InsuranceService,
        PointsService,
    ],
    exports: [
        VolunteersService,
        AssignmentsService,
        SkillService,
        VehicleService,
        InsuranceService,
        PointsService,
    ],
})
export class VolunteersModule { }


