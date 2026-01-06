import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment, EquipmentLog } from './entities';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Equipment, EquipmentLog])],
    controllers: [EquipmentController],
    providers: [EquipmentService],
    exports: [EquipmentService],
})
export class EquipmentModule { }
