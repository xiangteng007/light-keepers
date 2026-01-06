/**
 * NFC Module
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NfcService } from './nfc.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [NfcService],
    exports: [NfcService],
})
export class NfcModule { }
