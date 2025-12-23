import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { ResourceTransaction } from './resource-transaction.entity';
import { DonationSource } from './donation-source.entity';
import { ResourceBatch } from './resource-batch.entity';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Resource,
            ResourceTransaction,  // 📊 異動紀錄
            DonationSource,       // 🎁 捐贈來源
            ResourceBatch,        // 📦 批次管理
        ]),
    ],
    controllers: [ResourcesController],
    providers: [ResourcesService],
    exports: [ResourcesService],
})
export class ResourcesModule { }

