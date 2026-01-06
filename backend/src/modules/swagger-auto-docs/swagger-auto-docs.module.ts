import { Module } from '@nestjs/common';
import { SwaggerAutoDocsService } from './swagger-auto-docs.service';

@Module({
    providers: [SwaggerAutoDocsService],
    exports: [SwaggerAutoDocsService],
})
export class SwaggerAutoDocsModule { }
