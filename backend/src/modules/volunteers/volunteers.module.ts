import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';
import { Volunteer } from './volunteers.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Volunteer])],
    controllers: [VolunteersController],
    providers: [VolunteersService],
    exports: [VolunteersService],
})
export class VolunteersModule { }
