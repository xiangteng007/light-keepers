import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment, EquipmentLog } from './entities';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Equipment, EquipmentLog]),
        forwardRef(() => AuthModule), // For AuthService / JwtModule (原註解寫 JwtAuthGuard，該 guard 已於 1.6 收斂中移除)
    ],
    controllers: [EquipmentController],
    providers: [EquipmentService],
    exports: [EquipmentService],
})
export class EquipmentModule { }
