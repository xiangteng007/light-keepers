import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissingPerson } from './entities';
import { ReunificationService } from './reunification.service';
import { ReunificationController } from './reunification.controller';

@Module({
    imports: [TypeOrmModule.forFeature([MissingPerson])],
    controllers: [ReunificationController],
    providers: [ReunificationService],
    exports: [ReunificationService],
})
export class ReunificationModule { }
