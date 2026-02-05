/**
 * LINE Rich Menu Service
 * 
 * Manage LINE Rich Menu for enhanced user experience
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RichMenuItem {
    type: 'uri' | 'message' | 'postback';
    label: string;
    data?: string;
    text?: string;
    uri?: string;
}

export interface RichMenuArea {
    bounds: { x: number; y: number; width: number; height: number };
    action: RichMenuItem;
}

export interface RichMenuConfig {
    size: { width: 2500 | 1200 | 800; height: 1686 | 843 | 270 };
    selected: boolean;
    name: string;
    chatBarText: string;
    areas: RichMenuArea[];
}

@Injectable()
export class RichMenuService implements OnModuleInit {
    private readonly logger = new Logger(RichMenuService.name);
    private readonly channelAccessToken: string;
    private readonly apiUrl = 'https://api.line.me/v2/bot/richmenu';

    // Default Rich Menu configurations
    private readonly DEFAULT_MENUS: Record<string, RichMenuConfig> = {
        main: {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'Light Keepers Main Menu',
            chatBarText: '開啟選單',
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'uri', label: '任務中心', uri: 'https://lightkeepers.app/command/tasks' },
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'uri', label: '即時地圖', uri: 'https://lightkeepers.app/geo/tactical-map' },
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'uri', label: '警報列表', uri: 'https://lightkeepers.app/geo/alerts' },
                },
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'message', label: '我的班表', text: '查詢班表' },
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'postback', label: '簽到/簽退', data: 'action=checkin' },
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'uri', label: '個人帳戶', uri: 'https://lightkeepers.app/account' },
                },
            ],
        },
        volunteer: {
            size: { width: 2500, height: 843 },
            selected: false,
            name: 'Light Keepers Volunteer Menu',
            chatBarText: '志工選單',
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 625, height: 843 },
                    action: { type: 'postback', label: '簽到', data: 'action=checkin&type=in' },
                },
                {
                    bounds: { x: 625, y: 0, width: 625, height: 843 },
                    action: { type: 'postback', label: '簽退', data: 'action=checkin&type=out' },
                },
                {
                    bounds: { x: 1250, y: 0, width: 625, height: 843 },
                    action: { type: 'message', label: '查詢任務', text: '我的任務' },
                },
                {
                    bounds: { x: 1875, y: 0, width: 625, height: 843 },
                    action: { type: 'uri', label: '回報狀況', uri: 'https://lightkeepers.app/report' },
                },
            ],
        },
    };

    constructor(private readonly configService: ConfigService) {
        this.channelAccessToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN', '');
    }

    onModuleInit() {
        if (!this.channelAccessToken) {
            this.logger.warn('LINE_CHANNEL_ACCESS_TOKEN not configured');
        } else {
            this.logger.log('Rich Menu Service initialized');
        }
    }

    /**
     * Create a Rich Menu
     */
    async createRichMenu(config: RichMenuConfig): Promise<string | null> {
        if (!this.channelAccessToken) {
            this.logger.warn('Cannot create Rich Menu: No channel access token');
            return null;
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`LINE API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            this.logger.log(`Created Rich Menu: ${data.richMenuId}`);
            return data.richMenuId;
        } catch (error: unknown) {
            this.logger.error(`Failed to create Rich Menu: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Upload Rich Menu image
     */
    async uploadRichMenuImage(richMenuId: string, imageBuffer: Buffer): Promise<boolean> {
        if (!this.channelAccessToken) return false;

        try {
            const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'image/png',
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
                body: new Uint8Array(imageBuffer),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`LINE API error: ${response.status} - ${error}`);
            }

            this.logger.log(`Uploaded image for Rich Menu: ${richMenuId}`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to upload Rich Menu image: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Set default Rich Menu for all users
     */
    async setDefaultRichMenu(richMenuId: string): Promise<boolean> {
        if (!this.channelAccessToken) return false;

        try {
            const response = await fetch(`${this.apiUrl}/${richMenuId}/default`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`LINE API error: ${response.status} - ${error}`);
            }

            this.logger.log(`Set default Rich Menu: ${richMenuId}`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to set default Rich Menu: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Link Rich Menu to a specific user
     */
    async linkRichMenuToUser(userId: string, richMenuId: string): Promise<boolean> {
        if (!this.channelAccessToken) return false;

        try {
            const response = await fetch(`https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`LINE API error: ${response.status} - ${error}`);
            }

            this.logger.log(`Linked Rich Menu ${richMenuId} to user ${userId}`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to link Rich Menu: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Unlink Rich Menu from user
     */
    async unlinkRichMenuFromUser(userId: string): Promise<boolean> {
        if (!this.channelAccessToken) return false;

        try {
            const response = await fetch(`https://api.line.me/v2/bot/user/${userId}/richmenu`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`LINE API error: ${response.status} - ${error}`);
            }

            this.logger.log(`Unlinked Rich Menu from user ${userId}`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to unlink Rich Menu: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Get all Rich Menus
     */
    async getRichMenuList(): Promise<any[]> {
        if (!this.channelAccessToken) return [];

        try {
            const response = await fetch(`${this.apiUrl}/list`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`LINE API error: ${response.status}`);
            }

            const data = await response.json();
            return data.richmenus || [];
        } catch (error: unknown) {
            this.logger.error(`Failed to get Rich Menu list: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    /**
     * Delete a Rich Menu
     */
    async deleteRichMenu(richMenuId: string): Promise<boolean> {
        if (!this.channelAccessToken) return false;

        try {
            const response = await fetch(`${this.apiUrl}/${richMenuId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.channelAccessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`LINE API error: ${response.status} - ${error}`);
            }

            this.logger.log(`Deleted Rich Menu: ${richMenuId}`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to delete Rich Menu: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Get default menu config
     */
    getDefaultMenuConfig(menuType: 'main' | 'volunteer' = 'main'): RichMenuConfig {
        return this.DEFAULT_MENUS[menuType];
    }

    /**
     * Setup all default menus
     */
    async setupDefaultMenus(): Promise<Record<string, string | null>> {
        const results: Record<string, string | null> = {};

        for (const [key, config] of Object.entries(this.DEFAULT_MENUS)) {
            results[key] = await this.createRichMenu(config);
        }

        return results;
    }
}
