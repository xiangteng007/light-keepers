import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'light-keepers-api',
            version: '0.1.0',
        };
    }

    @Get('ready')
    ready() {
        // TODO: 檢查資料庫連線
        return {
            status: 'ready',
            checks: {
                database: 'ok',
            },
        };
    }
}
