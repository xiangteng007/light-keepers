import { Module } from '@nestjs/common';
import { ImageRecognitionService } from './image-recognition.service';

@Module({
    providers: [ImageRecognitionService],
    exports: [ImageRecognitionService],
})
export class ImageRecognitionModule { }
