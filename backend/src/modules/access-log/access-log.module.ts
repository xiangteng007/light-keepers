import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessLog } from './access-log.entity';
import { AccessLogService } from './access-log.service';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([AccessLog])],
    providers: [AccessLogService],
    exports: [AccessLogService],
})
export class AccessLogModule { }
