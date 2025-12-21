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
                    synchronize: false,
                    logging: !isProduction,
                    retryAttempts: 3,
                    retryDelay: 3000,
                    extra: isProduction ? {
                        socketPath: `/cloudsql/${configService.get('CLOUD_SQL_CONNECTION_NAME')}`,
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
    ],
})
export class AppModule { }

