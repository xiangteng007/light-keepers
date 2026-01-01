import {
    Controller,
    Get,
    Post,
    Body,
    Query,
} from '@nestjs/common';
import { ExternalApiService, NotificationPayload } from './external-api.service';

@Controller('integrations')
export class IntegrationsController {
    constructor(private readonly externalApiService: ExternalApiService) { }

    // ===== 氣象 =====

    @Get('weather')
    async getWeather(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
    ) {
        const weather = await this.externalApiService.getWeather(
            parseFloat(lat) || 25.0330,
            parseFloat(lng) || 121.5654,
        );

        return {
            success: true,
            data: weather,
        };
    }

    // ===== Geocoding =====

    @Get('geocode')
    async geocode(@Query('address') address: string) {
        if (!address) {
            return {
                success: false,
                message: 'Address is required',
            };
        }

        const result = await this.externalApiService.geocode(address);
        return {
            success: !!result,
            data: result,
        };
    }

    @Get('reverse-geocode')
    async reverseGeocode(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
    ) {
        const address = await this.externalApiService.reverseGeocode(
            parseFloat(lat),
            parseFloat(lng),
        );

        return {
            success: !!address,
            data: { address },
        };
    }

    // ===== 通知 =====

    @Post('notify')
    async sendNotification(@Body() payload: NotificationPayload) {
        const result = await this.externalApiService.sendNotification(payload);
        return {
            success: result.success,
            message: result.success
                ? `已透過 ${result.channels.join(', ')} 發送通知`
                : '通知發送失敗',
            channels: result.channels,
        };
    }

    @Post('line/push')
    async pushLineMessage(
        @Body() dto: { userId: string; message: string },
    ) {
        const success = await this.externalApiService.sendLineNotification(
            dto.userId,
            dto.message,
        );

        return {
            success,
            message: success ? 'LINE 訊息已發送' : 'LINE 訊息發送失敗',
        };
    }

    // ===== Webhook 測試 =====

    @Post('webhook/test')
    async testWebhook(
        @Body() dto: { url: string; payload: any },
    ) {
        const success = await this.externalApiService.sendWebhook(dto.url, dto.payload);
        return {
            success,
            message: success ? 'Webhook 發送成功' : 'Webhook 發送失敗',
        };
    }
}
