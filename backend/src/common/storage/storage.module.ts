/**
 * storage.module.ts
 * 
 * P4: Storage Abstraction - Storage Module
 * 
 * Provides unified storage service with configurable provider
 */
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, StorageFeatureOptions, StorageProvider } from './storage.interface';
import { GcsStorageProvider } from './gcs-storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

/**
 * Build the provider selected by `STORAGE_PROVIDER`, optionally pinned to a
 * specific GCS bucket. In local mode the bucket is irrelevant: every feature
 * shares the single `/uploads/` root that nginx serves.
 */
function createStorageProvider(
    configService: ConfigService,
    bucket?: string,
): StorageProvider {
    const provider = configService.get<string>('STORAGE_PROVIDER') || 'local';

    switch (provider) {
        case 'gcs':
            return new GcsStorageProvider(configService, { bucket });
        case 'local':
        default:
            return new LocalStorageProvider(configService);
    }
}

@Global()
@Module({})
export class StorageModule {
    static forRoot(): DynamicModule {
        return {
            module: StorageModule,
            imports: [ConfigModule],
            providers: [
                {
                    provide: STORAGE_PROVIDER,
                    useFactory: (configService: ConfigService): StorageProvider =>
                        createStorageProvider(configService),
                    inject: [ConfigService],
                },
            ],
            exports: [STORAGE_PROVIDER],
        };
    }

    /**
     * Publish a feature-scoped storage provider.
     *
     * Feature modules use this instead of the global `STORAGE_PROVIDER` when
     * they own a distinct GCS bucket, so switching `STORAGE_PROVIDER=gcs` keeps
     * each service pointed at the bucket it has always used.
     */
    static forFeature(options: StorageFeatureOptions): DynamicModule {
        return {
            module: StorageModule,
            imports: [ConfigModule],
            providers: [
                {
                    provide: options.token,
                    useFactory: (configService: ConfigService): StorageProvider =>
                        createStorageProvider(
                            configService,
                            configService.get<string>(options.bucketEnvKey) || options.defaultBucket,
                        ),
                    inject: [ConfigService],
                },
            ],
            exports: [options.token],
        };
    }
}
