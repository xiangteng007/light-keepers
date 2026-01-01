import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPost, PostComment, PostLike } from './community.entity';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
    imports: [TypeOrmModule.forFeature([CommunityPost, PostComment, PostLike])],
    controllers: [CommunityController],
    providers: [CommunityService],
    exports: [CommunityService],
})
export class CommunityModule { }
