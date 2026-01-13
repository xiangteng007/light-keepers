import { Module } from '@nestjs/common';
import { BiometricAuthService } from './biometric-auth.service';
import { WebAuthnService } from './services/webauthn.service';

@Module({
    providers: [BiometricAuthService, WebAuthnService],
    exports: [BiometricAuthService, WebAuthnService],
})
export class BiometricAuthModule { }

