/**
 * Files Module (Unified)
 * 
 * 整合所有檔案相關功能：
 * - 檔案儲存
 * - 上傳管理
 * - 檔案驗證
 * 
 * 取代舊模組：file-upload, uploads
 */

import { Module, Global } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { FilesController } from './files.controller';
import { FileUploadService } from './services/file-upload.service';

@Global()
@Module({
    providers: [FileStorageService, FileUploadService],
    controllers: [FilesController],
    exports: [FileStorageService, FileUploadService],
})
export class FilesModule { }
