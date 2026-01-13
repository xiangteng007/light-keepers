/**
 * WebAuthn Service
 * 
 * FIDO2/WebAuthn passwordless authentication
 * v1.0
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

// Note: In production, use @simplewebauthn/server
// This is a simplified implementation for demonstration

export interface WebAuthnCredential {
    id: string;
    accountId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceType: 'platform' | 'cross-platform';
    deviceName?: string;
    createdAt: Date;
    lastUsedAt?: Date;
}

export interface RegistrationOptions {
    challenge: string;
    rp: { name: string; id: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: { type: 'public-key'; alg: number }[];
    timeout: number;
    attestation: 'none' | 'indirect' | 'direct';
    authenticatorSelection: {
        authenticatorAttachment?: 'platform' | 'cross-platform';
        userVerification: 'required' | 'preferred' | 'discouraged';
        requireResidentKey: boolean;
    };
}

export interface AuthenticationOptions {
    challenge: string;
    timeout: number;
    rpId: string;
    allowCredentials: { type: 'public-key'; id: string }[];
    userVerification: 'required' | 'preferred' | 'discouraged';
}

@Injectable()
export class WebAuthnService {
    private readonly logger = new Logger(WebAuthnService.name);
    private readonly rpName = 'Light Keepers';
    private readonly rpId: string;

    // In-memory challenge store (use Redis in production)
    private challenges: Map<string, { challenge: string; expiresAt: Date }> = new Map();

    // In-memory credential store (use database in production)
    private credentials: Map<string, WebAuthnCredential[]> = new Map();

    constructor() {
        this.rpId = process.env.WEBAUTHN_RP_ID || 'localhost';
    }

    /**
     * Generate registration options for a new credential
     */
    generateRegistrationOptions(user: {
        id: string;
        email: string;
        displayName: string;
    }): RegistrationOptions {
        const challenge = this.generateChallenge();

        // Store challenge for verification
        this.challenges.set(user.id, {
            challenge,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        });

        const existingCredentials = this.credentials.get(user.id) || [];

        return {
            challenge,
            rp: {
                name: this.rpName,
                id: this.rpId,
            },
            user: {
                id: Buffer.from(user.id).toString('base64url'),
                name: user.email,
                displayName: user.displayName,
            },
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },   // ES256
                { type: 'public-key', alg: -257 }, // RS256
            ],
            timeout: 60000,
            attestation: 'none',
            authenticatorSelection: {
                userVerification: 'preferred',
                requireResidentKey: false,
            },
        };
    }

    /**
     * Verify registration response
     */
    async verifyRegistration(
        userId: string,
        credential: {
            id: string;
            rawId: string;
            type: string;
            response: {
                clientDataJSON: string;
                attestationObject: string;
            };
            authenticatorAttachment?: 'platform' | 'cross-platform';
        },
        deviceName?: string,
    ): Promise<WebAuthnCredential> {
        // Get stored challenge
        const stored = this.challenges.get(userId);
        if (!stored) {
            throw new BadRequestException('Challenge not found or expired');
        }

        if (new Date() > stored.expiresAt) {
            this.challenges.delete(userId);
            throw new BadRequestException('Challenge expired');
        }

        // In production, use @simplewebauthn/server to properly verify
        // Here we do a simplified verification
        try {
            const clientData = JSON.parse(
                Buffer.from(credential.response.clientDataJSON, 'base64url').toString()
            );

            // Verify challenge
            if (clientData.challenge !== stored.challenge) {
                throw new BadRequestException('Challenge mismatch');
            }

            // Verify origin
            if (!this.isValidOrigin(clientData.origin)) {
                throw new BadRequestException('Invalid origin');
            }

            // Create credential record
            const newCredential: WebAuthnCredential = {
                id: crypto.randomUUID(),
                accountId: userId,
                credentialId: credential.id,
                publicKey: credential.response.attestationObject, // Simplified
                counter: 0,
                deviceType: credential.authenticatorAttachment || 'cross-platform',
                deviceName: deviceName || this.guessDeviceName(credential.authenticatorAttachment),
                createdAt: new Date(),
            };

            // Store credential
            const existing = this.credentials.get(userId) || [];
            existing.push(newCredential);
            this.credentials.set(userId, existing);

            // Clear challenge
            this.challenges.delete(userId);

            this.logger.log(`WebAuthn credential registered for user ${userId}`);

            return newCredential;
        } catch (error: any) {
            this.logger.error(`Registration verification failed: ${error.message}`);
            throw new BadRequestException('Registration verification failed');
        }
    }

    /**
     * Generate authentication options
     */
    generateAuthenticationOptions(userId: string): AuthenticationOptions {
        const challenge = this.generateChallenge();

        this.challenges.set(userId, {
            challenge,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        const credentials = this.credentials.get(userId) || [];

        return {
            challenge,
            timeout: 60000,
            rpId: this.rpId,
            allowCredentials: credentials.map(c => ({
                type: 'public-key',
                id: c.credentialId,
            })),
            userVerification: 'preferred',
        };
    }

    /**
     * Verify authentication response
     */
    async verifyAuthentication(
        userId: string,
        credential: {
            id: string;
            rawId: string;
            type: string;
            response: {
                clientDataJSON: string;
                authenticatorData: string;
                signature: string;
            };
        },
    ): Promise<{ verified: boolean; credential?: WebAuthnCredential }> {
        const stored = this.challenges.get(userId);
        if (!stored) {
            throw new BadRequestException('Challenge not found');
        }

        if (new Date() > stored.expiresAt) {
            this.challenges.delete(userId);
            throw new BadRequestException('Challenge expired');
        }

        const credentials = this.credentials.get(userId) || [];
        const matchedCredential = credentials.find(c => c.credentialId === credential.id);

        if (!matchedCredential) {
            throw new BadRequestException('Credential not found');
        }

        try {
            const clientData = JSON.parse(
                Buffer.from(credential.response.clientDataJSON, 'base64url').toString()
            );

            if (clientData.challenge !== stored.challenge) {
                throw new BadRequestException('Challenge mismatch');
            }

            // In production, properly verify signature against stored public key
            // Here we do simplified verification

            // Update last used
            matchedCredential.lastUsedAt = new Date();
            matchedCredential.counter += 1;

            this.challenges.delete(userId);

            this.logger.log(`WebAuthn authentication successful for user ${userId}`);

            return { verified: true, credential: matchedCredential };
        } catch (error: any) {
            this.logger.error(`Authentication verification failed: ${error.message}`);
            return { verified: false };
        }
    }

    /**
     * Get user's registered credentials
     */
    getUserCredentials(userId: string): Omit<WebAuthnCredential, 'publicKey'>[] {
        const credentials = this.credentials.get(userId) || [];
        return credentials.map(({ publicKey, ...rest }) => rest);
    }

    /**
     * Remove a credential
     */
    removeCredential(userId: string, credentialId: string): boolean {
        const credentials = this.credentials.get(userId) || [];
        const index = credentials.findIndex(c => c.id === credentialId);

        if (index !== -1) {
            credentials.splice(index, 1);
            this.credentials.set(userId, credentials);
            this.logger.log(`Removed WebAuthn credential ${credentialId} for user ${userId}`);
            return true;
        }

        return false;
    }

    /**
     * Check if user has any WebAuthn credentials
     */
    hasCredentials(userId: string): boolean {
        const credentials = this.credentials.get(userId) || [];
        return credentials.length > 0;
    }

    // ===== Private Methods =====

    private generateChallenge(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    private isValidOrigin(origin: string): boolean {
        const allowedOrigins = [
            `https://${this.rpId}`,
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
        ];
        return allowedOrigins.includes(origin);
    }

    private guessDeviceName(attachment?: string): string {
        if (attachment === 'platform') {
            return '裝置生物辨識';
        }
        return '安全金鑰';
    }
}
