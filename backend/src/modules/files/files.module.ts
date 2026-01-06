/**
 * Files Module
 * File storage and management
 */

import { Module, Global } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { FilesController } from './files.controller';

@Global()
@Module({
    providers: [FileStorageService],
    controllers: [FilesController],
    exports: [FileStorageService],
})
export class FilesModule { }
