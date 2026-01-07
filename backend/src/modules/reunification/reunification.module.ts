import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissingPerson } from './entities';
import { ReunificationService } from './reunification.service';
import { ReunificationController } from './reunification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MissingPerson]),
        forwardRef(() => AuthModule), // For JwtAuthGuard
    ],
    controllers: [ReunificationController],
    providers: [ReunificationService],
    exports: [ReunificationService],
})
export class ReunificationModule { }
