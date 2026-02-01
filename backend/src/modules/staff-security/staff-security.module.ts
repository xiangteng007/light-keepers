/**
 * staff-security.module.ts
 * 
 * P0: Staff Security Management
 * 
 * Critical functionality for NGO field operations:
 * - Security incident reporting
 * - Staff check-in/panic button
 * - Evacuation planning
 * - Security briefings
 */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityIncidentService } from './services/security-incident.service';
import { StaffCheckInService } from './services/staff-checkin.service';
import { EvacuationPlanService } from './services/evacuation-plan.service';
import { StaffSecurityController } from './staff-security.controller';
import { SecurityIncident } from './entities/security-incident.entity';
import { StaffCheckIn } from './entities/staff-checkin.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([SecurityIncident, StaffCheckIn]),
    ],
    controllers: [StaffSecurityController],
    providers: [
        SecurityIncidentService,
        StaffCheckInService,
        EvacuationPlanService,
    ],
    exports: [
        SecurityIncidentService,
        StaffCheckInService,
        EvacuationPlanService,
    ],
})
export class StaffSecurityModule { }
