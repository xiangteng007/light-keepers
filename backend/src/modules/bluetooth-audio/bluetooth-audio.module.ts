import { Module } from '@nestjs/common';
import { BluetoothAudioService } from './bluetooth-audio.service';

@Module({
    providers: [BluetoothAudioService],
    exports: [BluetoothAudioService],
})
export class BluetoothAudioModule { }
