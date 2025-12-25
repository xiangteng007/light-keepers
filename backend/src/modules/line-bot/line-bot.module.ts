import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineBotController } from './line-bot.controller';
import { LineBotService } from './line-bot.service';
import { Account } from '../accounts/entities';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Account]),
    ],
    controllers: [LineBotController],
    providers: [LineBotService],
    exports: [LineBotService],
})
export class LineBotModule { }
