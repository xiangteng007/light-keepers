import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicResourcesService } from './public-resources.service';
import { PublicResourcesController } from './public-resources.controller';
import { AirRaidShelter } from './entities/air-raid-shelter.entity';
import { AirRaidSheltersService } from './air-raid-shelters.service';
import { AirRaidSheltersSyncService } from './air-raid-shelters-sync.service';

@Module({
    imports: [HttpModule, TypeOrmModule.forFeature([AirRaidShelter])],
    controllers: [PublicResourcesController],
    providers: [PublicResourcesService, AirRaidSheltersService, AirRaidSheltersSyncService],
    exports: [PublicResourcesService, AirRaidSheltersService],
})
export class PublicResourcesModule { }
