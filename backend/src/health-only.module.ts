import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthOnlyController } from './health-only.controller';

/**
 * Minimal App Module for CI Health Checks
 * 
 * This module is loaded when DB_REQUIRED=false to allow container startup
 * validation without any database dependencies. It contains only the
 * health check endpoint.
 * 
 * Usage: Set DB_REQUIRED=false in environment to load this module instead
 * of the full AppModule.
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
    ],
    controllers: [HealthOnlyController],
})
export class HealthOnlyModule { }
