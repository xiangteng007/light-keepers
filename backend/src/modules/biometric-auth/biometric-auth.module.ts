import { Module } from '@nestjs/common';
import { BiometricAuthService } from './biometric-auth.service';

@Module({
    providers: [BiometricAuthService],
    exports: [BiometricAuthService],
})
export class BiometricAuthModule { }
