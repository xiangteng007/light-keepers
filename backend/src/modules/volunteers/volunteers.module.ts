import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';
import { Volunteer } from './volunteers.entity';
import { VolunteerAssignment } from './volunteer-assignments.entity';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
    imports: [TypeOrmModule.forFeature([Volunteer, VolunteerAssignment])],
    controllers: [VolunteersController, AssignmentsController],
    providers: [VolunteersService, AssignmentsService],
    exports: [VolunteersService, AssignmentsService],
})
export class VolunteersModule { }
