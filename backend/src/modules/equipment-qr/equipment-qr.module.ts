import { Module } from '@nestjs/common';
import { EquipmentQrService } from './equipment-qr.service';
import { EquipmentQrController } from './equipment-qr.controller';

@Module({
    providers: [EquipmentQrService],
    controllers: [EquipmentQrController],
    exports: [EquipmentQrService],
})
export class EquipmentQrModule { }
