/**
 * storage.module.ts
 * 
 * P4: Storage Abstraction - Storage Module
 * 
 * Provides unified storage service with configurable provider
 */
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, StorageProvider } from './storage.interface';
import { GcsStorageProvider } from './gcs-storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

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
                    useFactory: (configService: ConfigService): StorageProvider => {
                        const provider = configService.get<string>('STORAGE_PROVIDER') || 'local';

                        switch (provider) {
                            case 'gcs':
                                return new GcsStorageProvider(configService);
                            case 'local':
                            default:
                                return new LocalStorageProvider(configService);
                        }
                    },
                    inject: [ConfigService],
                },
            ],
            exports: [STORAGE_PROVIDER],
        };
    }
}
