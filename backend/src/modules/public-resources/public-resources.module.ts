import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PublicResourcesService } from './public-resources.service';
import { PublicResourcesController } from './public-resources.controller';

@Module({
    imports: [HttpModule],
    controllers: [PublicResourcesController],
    providers: [PublicResourcesService],
    exports: [PublicResourcesService],
})
export class PublicResourcesModule { }
