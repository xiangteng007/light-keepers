import { Module } from '@nestjs/common';
import { DataEncryptionService } from './data-encryption.service';

@Module({
    providers: [DataEncryptionService],
    exports: [DataEncryptionService],
})
export class DataEncryptionModule { }
