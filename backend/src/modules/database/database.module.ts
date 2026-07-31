import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Resolve the TypeORM `synchronize` flag.
 *
 * SAFETY INVARIANT: schema auto-sync is HARD-DISABLED in production.
 * `SYNC_TABLES=true` lets TypeORM rewrite the live schema (drop/alter columns,
 * drop indexes) on every boot. In production that is unrecoverable data loss,
 * so a single stray env var must never be able to enable it.
 *
 * Non-production (development / staging / test) keeps the existing behaviour:
 * staging currently still relies on SYNC_TABLES=true until the baseline
 * migration lands, at which point this flag can be removed entirely.
 *
 * Exported for unit testing.
 */
export function resolveSynchronize(env: NodeJS.ProcessEnv = process.env): boolean {
    const isProduction = env.NODE_ENV === 'production';
    const syncRequested = env.SYNC_TABLES === 'true';

    if (isProduction) {
        if (syncRequested) {
            console.error(
                '[TypeORM] SECURITY: SYNC_TABLES=true was requested while NODE_ENV=production. ' +
                'Schema auto-synchronize is HARD-DISABLED in production and this setting has been ignored. ' +
                'Use migrations (npm run migration:run) to change the production schema. ' +
                'Remove SYNC_TABLES from the production deployment configuration.',
            );
        }
        return false;
    }

    return syncRequested;
}

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
                            // Hard-disabled in production regardless of SYNC_TABLES (see resolveSynchronize)
                            synchronize: resolveSynchronize(process.env),
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
