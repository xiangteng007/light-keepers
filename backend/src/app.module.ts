import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // 排程模組 (NCDR 自動同步)
        ScheduleModule.forRoot(),

        // Cloud SQL 連線
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get('NODE_ENV') === 'production';

                return {
                    type: 'postgres',
                    host: isProduction
                        ? `/cloudsql/${configService.get('CLOUD_SQL_CONNECTION_NAME')}`
                        : configService.get('DB_HOST', 'localhost'),
                    port: isProduction ? undefined : configService.get('DB_PORT', 5432),
                    username: configService.get('DB_USERNAME', 'postgres'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_DATABASE', 'lightkeepers'),
                    autoLoadEntities: true,
                    synchronize: true, // 暫時啟用以建立 ncdr_alerts 表，之後需改回 false
                    logging: !isProduction,
                    retryAttempts: 10, // 增加重試次數給 Cloud SQL cold start
                    retryDelay: 5000,  // 增加重試間隔
                    connectTimeoutMS: 60000, // 60秒連線超時
                    extra: isProduction ? {
                        socketPath: `/cloudsql/${configService.get('CLOUD_SQL_CONNECTION_NAME')}`,
                        connectionTimeoutMillis: 60000,
                    } : {},
                };
            },
            inject: [ConfigService],
        }),

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
    ],
})
export class AppModule { }

