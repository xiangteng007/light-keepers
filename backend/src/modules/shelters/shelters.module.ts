import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SheltersController } from './shelters.controller';
import { SheltersService } from './shelters.service';
import {
    Shelter,
    ShelterEvacuee,
    ShelterHealthScreening,
    ShelterDailyReport,
} from './entities/shelter.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Shelter,
            ShelterEvacuee,
            ShelterHealthScreening,
            ShelterDailyReport,
        ]),
    ],
    controllers: [SheltersController],
    providers: [SheltersService],
    exports: [SheltersService],
})
export class SheltersModule {}
