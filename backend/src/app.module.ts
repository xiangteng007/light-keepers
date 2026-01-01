import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SharedAuthModule } from './modules/shared/shared-auth.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { EventsModule } from './modules/events/events.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NcdrAlertsModule } from './modules/ncdr-alerts/ncdr-alerts.module';
import { PublicResourcesModule } from './modules/public-resources/public-resources.module';
import { ManualsModule } from './modules/manuals/manuals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { TrainingModule } from './modules/training/training.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsExportModule } from './modules/reports-export/reports-export.module';
import { LineBotModule } from './modules/line-bot/line-bot.module';
import { AccessLogModule } from './modules/access-log/access-log.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MenuConfigModule } from './modules/menu-config/menu-config.module';
import { WeatherForecastModule } from './modules/weather-forecast/weather-forecast.module';
import { DonationsModule } from './modules/donations/donations.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { CommunityModule } from './modules/community/community.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { BackupModule } from './modules/backup/backup.module';
import { TenantModule } from './modules/tenants/tenant.module';
import { CloudLoggerService } from './common/services/cloud-logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // 排程模組 (NCDR 自動同步)
        ScheduleModule.forRoot(),

        // Rate Limiting (API Gateway)
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000,   // 1秒
                limit: 10,   // 最多10請求
            },
            {
                name: 'long',
                ttl: 60000,  // 1分鐘
                limit: 100,  // 最多100請求
            },
        ]),

        // Cloud SQL 連線
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get('NODE_ENV') === 'production';
                const dbHost = configService.get('DB_HOST', 'localhost');

                const config: any = {
                    type: 'postgres',
                    host: dbHost,
                    username: configService.get('DB_USERNAME', 'postgres'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_DATABASE', 'lightkeepers'),
                    autoLoadEntities: true,
                    synchronize: false, // VMS 表已建立，關閉 sync 確保生產安全
                    logging: !isProduction,
                    retryAttempts: 10, // 增加重試次數給 Cloud SQL cold start
                    retryDelay: 5000,  // 增加重試間隔
                    connectTimeoutMS: 60000, // 60秒連線超時
                    extra: {
                        connectionTimeoutMillis: 60000,
                    },
                };

                // Only set port for non-production (local development)
                // For production Cloud SQL Unix socket, do not set port at all
                if (!isProduction) {
                    config.port = configService.get('DB_PORT', 5432);
                }

                return config;
            },
            inject: [ConfigService],
        }),

        // 共用認證模組 (Global)
        SharedAuthModule,

        // 功能模組
        HealthModule,
        AuthModule,
        AccountsModule,
        EventsModule,
        TasksModule,
        NcdrAlertsModule,
        PublicResourcesModule,
        ManualsModule,
        ReportsModule,
        VolunteersModule,
        TrainingModule,
        NotificationsModule,
        ResourcesModule,
        RealtimeModule,
        ReportsExportModule,
        LineBotModule,
        AccessLogModule, // 🔐 存取日誌
        UploadsModule,   // 📁 檔案上傳
        MenuConfigModule, // 📋 選單設定
        WeatherForecastModule, // ☁️ 氣象預報
        DonationsModule, // 💰 捐款系統
        AnnouncementsModule, // 📢 公告系統
        ActivitiesModule, // 📅 活動報名
        CommunityModule, // 💬 社群牆
        AnalyticsModule, // 📊 AI 趨勢預測
        IntegrationsModule, // 🔗 外部 API 整合
        BackupModule, // 💾 數據備份
        TenantModule, // 🏢 多租戶
    ],
    providers: [
        CloudLoggerService,
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    exports: [CloudLoggerService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggingMiddleware)
            .forRoutes('*');
    }
}
