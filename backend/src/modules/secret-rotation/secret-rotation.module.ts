import { Module } from '@nestjs/common';
import { SecretRotationService } from './secret-rotation.service';

@Module({
    providers: [SecretRotationService],
    exports: [SecretRotationService],
})
export class SecretRotationModule { }
