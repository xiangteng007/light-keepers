import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissingPerson } from './entities';
import { ReunificationService } from './reunification.service';
import { ReunificationController } from './reunification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MissingPerson]),
        forwardRef(() => AuthModule), // For AuthService / JwtModule (原註解寫 JwtAuthGuard，該 guard 已於 1.6 收斂中移除)
    ],
    controllers: [ReunificationController],
    providers: [ReunificationService],
    exports: [ReunificationService],
})
export class ReunificationModule { }
