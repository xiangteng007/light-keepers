/**
 * Cesium 3D Module
 */

import { Module } from '@nestjs/common';
import { Cesium3dService } from './cesium-3d.service';

@Module({
    providers: [Cesium3dService],
    exports: [Cesium3dService],
})
export class Cesium3dModule { }
