import { Injectable, Logger } from '@nestjs/common';

/**
 * Biometric Auth Service
 * Fingerprint/Face ID authentication support
 */
@Injectable()
export class BiometricAuthService {
    private readonly logger = new Logger(BiometricAuthService.name);
    private registrations: Map<string, BiometricRegistration> = new Map();
    private challenges: Map<string, AuthChallenge> = new Map();

    /**
     * 開始註冊
     */
    startRegistration(userId: string): RegistrationChallenge {
        const challenge = this.generateChallenge();

        this.challenges.set(challenge.id, {
            id: challenge.id,
            userId,
            type: 'registration',
            challenge: challenge.value,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 分鐘
        });

        return {
            challengeId: challenge.id,
            challenge: challenge.value,
            rpId: 'lightkeepers.org',
            rpName: '光守護者',
            userId,
            userName: userId,
            timeout: 300000,
        };
    }

    /**
     * 完成註冊
     */
    completeRegistration(challengeId: string, credential: CredentialData): RegistrationResult {
        const challengeData = this.challenges.get(challengeId);
        if (!challengeData) {
            return { success: false, error: 'Challenge not found or expired' };
        }

        if (new Date() > challengeData.expiresAt) {
            this.challenges.delete(challengeId);
            return { success: false, error: 'Challenge expired' };
        }

        // 儲存憑證
        const registration: BiometricRegistration = {
            id: `bio-${Date.now()}`,
            userId: challengeData.userId,
            credentialId: credential.id,
            publicKey: credential.publicKey,
            type: credential.type,
            createdAt: new Date(),
            lastUsed: new Date(),
        };

        this.registrations.set(challengeData.userId, registration);
        this.challenges.delete(challengeId);

        return { success: true, registrationId: registration.id };
    }

    /**
     * 開始認證
     */
    startAuthentication(userId: string): AuthenticationChallenge | null {
        const registration = this.registrations.get(userId);
        if (!registration) {
            return null;
        }

        const challenge = this.generateChallenge();

        this.challenges.set(challenge.id, {
            id: challenge.id,
            userId,
            type: 'authentication',
            challenge: challenge.value,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 分鐘
        });

        return {
            challengeId: challenge.id,
            challenge: challenge.value,
            allowCredentials: [{ id: registration.credentialId, type: 'public-key' }],
            timeout: 120000,
        };
    }

    /**
     * 驗證認證
     */
    verifyAuthentication(challengeId: string, response: AuthResponse): AuthResult {
        const challengeData = this.challenges.get(challengeId);
        if (!challengeData) {
            return { success: false, error: 'Challenge not found' };
        }

        if (new Date() > challengeData.expiresAt) {
            this.challenges.delete(challengeId);
            return { success: false, error: 'Challenge expired' };
        }

        const registration = this.registrations.get(challengeData.userId);
        if (!registration || registration.credentialId !== response.credentialId) {
            return { success: false, error: 'Credential mismatch' };
        }

        // 簡化驗證 (實際應驗證簽章)
        registration.lastUsed = new Date();
        this.challenges.delete(challengeId);

        return { success: true, userId: challengeData.userId };
    }

    /**
     * 檢查是否已註冊
     */
    isRegistered(userId: string): boolean {
        return this.registrations.has(userId);
    }

    /**
     * 取消註冊
     */
    removeRegistration(userId: string): boolean {
        return this.registrations.delete(userId);
    }

    /**
     * 取得註冊資訊
     */
    getRegistration(userId: string): BiometricRegistration | undefined {
        return this.registrations.get(userId);
    }

    private generateChallenge(): { id: string; value: string } {
        const bytes = new Array(32).fill(0).map(() => Math.floor(Math.random() * 256));
        return {
            id: `ch-${Date.now()}`,
            value: Buffer.from(bytes).toString('base64'),
        };
    }
}

// Types
interface AuthChallenge { id: string; userId: string; type: 'registration' | 'authentication'; challenge: string; createdAt: Date; expiresAt: Date; }
interface BiometricRegistration { id: string; userId: string; credentialId: string; publicKey: string; type: string; createdAt: Date; lastUsed: Date; }
interface RegistrationChallenge { challengeId: string; challenge: string; rpId: string; rpName: string; userId: string; userName: string; timeout: number; }
interface CredentialData { id: string; publicKey: string; type: string; }
interface RegistrationResult { success: boolean; registrationId?: string; error?: string; }
interface AuthenticationChallenge { challengeId: string; challenge: string; allowCredentials: { id: string; type: string }[]; timeout: number; }
interface AuthResponse { credentialId: string; signature: string; authenticatorData: string; }
interface AuthResult { success: boolean; userId?: string; error?: string; }
