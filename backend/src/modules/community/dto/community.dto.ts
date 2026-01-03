import {
    IsString,
    IsOptional,
    IsArray,
    IsUUID,
    IsIn,
    IsBoolean,
    Length,
    Min,
    Max,
    IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PostCategory, PostStatus } from '../community.entity';

/**
 * DTO for creating a new community post
 */
export class CreatePostDto {
    @IsUUID('4', { message: '作者 ID 必須是有效的 UUID' })
    authorId: string;

    @IsString()
    @Length(1, 100, { message: '作者姓名長度需介於 1-100 字元' })
    authorName: string;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    authorAvatar?: string;

    @IsString()
    @IsOptional()
    @Length(0, 200, { message: '標題長度不可超過 200 字元' })
    title?: string;

    @IsString()
    @Length(1, 10000, { message: '內容長度需介於 1-10000 字元' })
    content: string;

    @IsIn(['general', 'help', 'share', 'event', 'emergency', 'volunteer'], {
        message: '分類必須是有效的類型',
    })
    @IsOptional()
    category?: PostCategory;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '連結長度不可超過 500 字元' })
    link?: string;
}

/**
 * DTO for updating an existing post
 */
export class UpdatePostDto {
    @IsString()
    @IsOptional()
    @Length(0, 200, { message: '標題長度不可超過 200 字元' })
    title?: string;

    @IsString()
    @IsOptional()
    @Length(1, 10000, { message: '內容長度需介於 1-10000 字元' })
    content?: string;

    @IsIn(['general', 'help', 'share', 'event', 'emergency', 'volunteer'], {
        message: '分類必須是有效的類型',
    })
    @IsOptional()
    category?: PostCategory;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '連結長度不可超過 500 字元' })
    link?: string;
}

/**
 * DTO for creating a comment
 */
export class CreateCommentDto {
    @IsUUID('4', { message: '貼文 ID 必須是有效的 UUID' })
    postId: string;

    @IsUUID('4')
    @IsOptional()
    parentId?: string;

    @IsUUID('4', { message: '作者 ID 必須是有效的 UUID' })
    authorId: string;

    @IsString()
    @Length(1, 100, { message: '作者姓名長度需介於 1-100 字元' })
    authorName: string;

    @IsString()
    @Length(1, 2000, { message: '評論內容長度需介於 1-2000 字元' })
    content: string;
}

/**
 * DTO for querying posts
 */
export class PostQueryDto {
    @IsIn(['general', 'help', 'share', 'event', 'emergency', 'volunteer'], {
        message: '分類必須是有效的類型',
    })
    @IsOptional()
    category?: PostCategory;

    @IsUUID('4')
    @IsOptional()
    authorId?: string;

    @IsString()
    @IsOptional()
    search?: string;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    pinnedOnly?: boolean;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    offset?: number;
}

/**
 * DTO for toggling like
 */
export class ToggleLikeDto {
    @IsUUID('4', { message: '使用者 ID 必須是有效的 UUID' })
    userId: string;
}

/**
 * DTO for pinning/unpinning a post
 */
export class PinPostDto {
    @IsBoolean()
    isPinned: boolean;
}

/**
 * DTO for deleting a post/comment with authorization info
 */
export class DeletePostDto {
    @IsUUID('4', { message: '作者 ID 必須是有效的 UUID' })
    authorId: string;

    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;
}
