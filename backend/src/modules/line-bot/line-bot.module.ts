import { Module, Global } from '@nestjs/common';
import { LineBotController } from './line-bot.controller';
import { LineBotService } from './line-bot.service';

@Global()
@Module({
    controllers: [LineBotController],
    providers: [LineBotService],
    exports: [LineBotService],
})
export class LineBotModule { }
