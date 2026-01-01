import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Conditional Database Module
 * 
 * This module provides conditional TypeORM initialization based on the DB_REQUIRED environment variable.
 * When DB_REQUIRED=false, it returns an empty module to allow the application to start without database access.
 * This is useful for CI health checks and environments where the database is unavailable.
 */
@Module({})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        // Check DB_REQUIRED at module registration time (synchronous check)
        const dbRequired = process.env.DB_REQUIRED !== 'false';

        console.log(`[DatabaseModule] DB_REQUIRED check: ${dbRequired}`);

        if (!dbRequired) {
            console.log('[DatabaseModule] Skipping TypeORM initialization (DB_REQUIRED=false)');
            // Return empty module - no TypeORM, no database dependencies
            return {
                module: DatabaseModule,
                imports: [],
                exports: [],
            };
        }

        // Normal TypeORM initialization when database is required
        console.log('[DatabaseModule] Initializing TypeORM (DB_REQUIRED=true)');
        return {
            module: DatabaseModule,
            imports: [
                TypeOrmModule.forRootAsync({
                    imports: [ConfigModule],
                    useFactory: (configService: ConfigService) => {
                        const isProduction = configService.get('NODE_ENV') === 'production';
                        const dbHost = configService.get('DB_HOST');

                        console.log(`[TypeORM] Environment: ${isProduction ? 'production' : 'development'}`);
                        console.log(`[TypeORM] DB Host: ${dbHost || '(not configured)'}`);

                        // Production environment must have DB_HOST explicitly set
                        if (isProduction && !dbHost) {
                            console.error('[TypeORM] CRITICAL: DB_HOST not configured in production!');
                            console.error('[TypeORM] Please set DB_HOST to Cloud SQL Unix socket path:');
                            console.error('[TypeORM] Example: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME');
                            // Don't throw - allow container to start but /ready will return degraded status
                        }

                        const config: any = {
                            type: 'postgres',
                            host: dbHost || 'localhost', // fallback for development
                            username: configService.get('DB_USERNAME', 'postgres'),
                            password: configService.get('DB_PASSWORD'),
                            database: configService.get('DB_DATABASE', 'lightkeepers'),
                            autoLoadEntities: true,
                            synchronize: false,
                            logging: !isProduction ? ['error', 'warn', 'query'] : ['error'],
                            // Cloud Run optimization: more retries but don't block startup
                            retryAttempts: isProduction ? 5 : 3,
                            retryDelay: isProduction ? 5000 : 3000,
                            // Connection pool settings
                            extra: {
                                max: 10, // max connections
                                connectionTimeoutMillis: 30000, // 30s connection timeout
                                idleTimeoutMillis: 30000,
                            },
                        };

                        // Only set port for non-production (local development)
                        if (!isProduction) {
                            config.port = configService.get('DB_PORT', 5432);
                        }

                        return config;
                    },
                    inject: [ConfigService],
                }),
            ],
            exports: [TypeOrmModule],
        };
    }
}
