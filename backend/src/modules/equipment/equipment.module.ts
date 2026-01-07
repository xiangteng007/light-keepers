import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment, EquipmentLog } from './entities';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Equipment, EquipmentLog]),
        forwardRef(() => AuthModule), // For JwtAuthGuard
    ],
    controllers: [EquipmentController],
    providers: [EquipmentService],
    exports: [EquipmentService],
})
export class EquipmentModule { }
