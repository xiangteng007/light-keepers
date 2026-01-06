/**
 * QR Scanner Module
 */

import { Module } from '@nestjs/common';
import { QrScannerService } from './qr-scanner.service';

@Module({
    providers: [QrScannerService],
    exports: [QrScannerService],
})
export class QrScannerModule { }
