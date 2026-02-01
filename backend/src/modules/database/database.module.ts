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
                    useFactory: () => {
                        // CRITICAL: Use process.env directly to avoid ConfigService sync gap
                        // This pattern was confirmed to fix Cloud Run PORT 8080 timeout
                        // @see knowledge/senteng_erp_master/artifacts/engineering/infrastructure_and_ops.md
                        const isProduction = process.env.NODE_ENV === 'production';
                        const dbHost = process.env.DB_HOST;

                        console.log('[TypeORM EARLY BOOT]', JSON.stringify({
                            NODE_ENV: process.env.NODE_ENV,
                            DB_HOST: dbHost,
                            DB_DATABASE: process.env.DB_DATABASE,
                            timestamp: new Date().toISOString()
                        }));

                        // Check if DB_HOST is a Unix socket path (Cloud SQL)
                        const isUnixSocket = dbHost && dbHost.startsWith('/cloudsql/');

                        if (isProduction && !dbHost) {
                            console.error('[TypeORM] CRITICAL: DB_HOST not configured in production!');
                        }

                        const config: any = {
                            type: 'postgres',
                            username: process.env.DB_USERNAME || 'postgres',
                            password: process.env.DB_PASSWORD,
                            database: process.env.DB_DATABASE || 'lightkeepers',
                            autoLoadEntities: true,
                            synchronize: process.env.SYNC_TABLES === 'true',
                            logging: !isProduction ? ['error', 'warn', 'query'] : ['error'],
                            retryAttempts: isProduction ? 5 : 3,
                            retryDelay: isProduction ? 5000 : 3000,
                        };

                        // Configure connection based on host type
                        if (isUnixSocket) {
                            // Cloud SQL Unix socket connection - MANDATORY settings:
                            // 1. host = socket path
                            // 2. port = undefined (CRITICAL: pg driver fails with numeric port on socket)
                            // 3. ssl = false (Unix sockets don't need SSL)
                            console.log(`[TypeORM] Using Unix socket: ${dbHost}`);
                            config.host = dbHost;
                            config.port = undefined;
                            config.ssl = false;
                            config.extra = {
                                max: 10,
                                connectionTimeoutMillis: 15000,
                                idleTimeoutMillis: 30000,
                            };
                        } else {
                            // TCP connection (development or direct IP)
                            config.host = dbHost || 'localhost';
                            config.port = parseInt(process.env.DB_PORT || '5432', 10);
                            config.extra = {
                                max: 10,
                                connectionTimeoutMillis: 30000,
                                idleTimeoutMillis: 30000,
                            };
                        }

                        return config;
                    },
                    // IMPORTANT: No inject array - using process.env directly
                }),
            ],
            exports: [TypeOrmModule],
        };
    }
}
