/**
 * LINE LIFF Application Integration
 * 
 * Full LINE LIFF (LINE Front-end Framework) integration
 * for disaster response mobile experience.
 */

import liff from '@line/liff';

/**
 * LIFF Configuration
 */
export interface LiffConfig {
    liffId: string;
    features: {
        shareTargetPicker: boolean;
        scanCodeV2: boolean;
        sendMessages: boolean;
    };
}

/**
 * User profile from LINE
 */
export interface LineUserProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
    email?: string;
}

/**
 * Share message types
 */
export type ShareMessage = 
    | { type: 'text'; text: string }
    | { type: 'image'; originalContentUrl: string; previewImageUrl: string }
    | { type: 'location'; title: string; address: string; latitude: number; longitude: number }
    | { type: 'flex'; altText: string; contents: any };

/**
 * LIFF Service
 */
class LiffService {
    private initialized = false;
    private config: LiffConfig | null = null;

    /**
     * Initialize LIFF
     */
    async init(config: LiffConfig): Promise<boolean> {
        if (this.initialized) return true;

        try {
            await liff.init({ liffId: config.liffId });
            this.config = config;
            this.initialized = true;
            console.log('[LIFF] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[LIFF] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Check if running in LINE app
     */
    isInClient(): boolean {
        return liff.isInClient();
    }

    /**
     * Check if logged in
     */
    isLoggedIn(): boolean {
        return liff.isLoggedIn();
    }

    /**
     * Login with LINE
     */
    login(redirectUri?: string): void {
        if (!this.isLoggedIn()) {
            liff.login({ redirectUri });
        }
    }

    /**
     * Logout
     */
    logout(): void {
        if (this.isLoggedIn()) {
            liff.logout();
        }
    }

    /**
     * Get user profile
     */
    async getProfile(): Promise<LineUserProfile | null> {
        if (!this.isLoggedIn()) return null;

        try {
            const profile = await liff.getProfile();
            return {
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                statusMessage: profile.statusMessage,
            };
        } catch (error) {
            console.error('[LIFF] Failed to get profile:', error);
            return null;
        }
    }

    /**
     * Get access token
     */
    getAccessToken(): string | null {
        return this.isLoggedIn() ? liff.getAccessToken() : null;
    }

    /**
     * Get ID token
     */
    getIDToken(): string | null {
        return this.isLoggedIn() ? liff.getIDToken() : null;
    }

    /**
     * Get decoded ID token
     */
    getDecodedIDToken(): any | null {
        return this.isLoggedIn() ? liff.getDecodedIDToken() : null;
    }

    /**
     * Send messages to current chat
     */
    async sendMessages(messages: ShareMessage[]): Promise<boolean> {
        if (!this.isInClient()) {
            console.warn('[LIFF] sendMessages only works in LINE client');
            return false;
        }

        try {
            await liff.sendMessages(messages);
            return true;
        } catch (error) {
            console.error('[LIFF] Failed to send messages:', error);
            return false;
        }
    }

    /**
     * Share target picker - send to friends/groups
     */
    async shareTargetPicker(messages: ShareMessage[]): Promise<boolean> {
        if (!liff.isApiAvailable('shareTargetPicker')) {
            console.warn('[LIFF] shareTargetPicker not available');
            return false;
        }

        try {
            const result = await liff.shareTargetPicker(messages);
            return result?.status === 'success';
        } catch (error) {
            console.error('[LIFF] Share failed:', error);
            return false;
        }
    }

    /**
     * Scan QR/Bar code
     */
    async scanCode(): Promise<string | null> {
        if (!liff.isApiAvailable('scanCodeV2')) {
            console.warn('[LIFF] scanCodeV2 not available');
            return null;
        }

        try {
            const result = await liff.scanCodeV2();
            return result?.value || null;
        } catch (error) {
            console.error('[LIFF] Scan failed:', error);
            return null;
        }
    }

    /**
     * Open external URL
     */
    openWindow(url: string, external = false): void {
        liff.openWindow({ url, external });
    }

    /**
     * Close LIFF window
     */
    closeWindow(): void {
        liff.closeWindow();
    }

    /**
     * Get OS type
     */
    getOS(): 'ios' | 'android' | 'web' {
        return liff.getOS() as 'ios' | 'android' | 'web';
    }

    /**
     * Get LINE version
     */
    getLineVersion(): string | null {
        return liff.getLineVersion();
    }

    /**
     * Create emergency share message
     */
    createEmergencyMessage(
        title: string,
        location: { lat: number; lng: number; address: string },
        details: string
    ): ShareMessage {
        return {
            type: 'flex',
            altText: `🚨 ${title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🚨 緊急通報', weight: 'bold', size: 'lg', color: '#FF0000' }
                    ],
                    backgroundColor: '#FFF3F3'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: title, weight: 'bold', size: 'md', wrap: true },
                        { type: 'text', text: `📍 ${location.address}`, size: 'sm', color: '#666666', margin: 'md' },
                        { type: 'text', text: details, size: 'sm', margin: 'md', wrap: true }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '查看位置',
                                uri: `https://www.google.com/maps?q=${location.lat},${location.lng}`
                            },
                            style: 'primary',
                            color: '#FF0000'
                        }
                    ]
                }
            }
        };
    }
}

// Singleton instance
export const liffService = new LiffService();
export default liffService;
