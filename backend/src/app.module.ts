import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // Cloud SQL 連線
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get('NODE_ENV') === 'production';

                return {
                    type: 'postgres',
                    // Cloud Run 使用 Unix socket 連接 Cloud SQL
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

        HealthModule,
        AccountsModule,
    ],
})
export class AppModule { }
