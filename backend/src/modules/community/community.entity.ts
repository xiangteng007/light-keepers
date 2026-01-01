import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Account } from '../accounts/entities/account.entity';

export type PostCategory = 'general' | 'help' | 'share' | 'event' | 'emergency' | 'volunteer';
export type PostStatus = 'active' | 'hidden' | 'deleted';

// ===== 討論貼文 =====
@Entity('community_posts')
export class CommunityPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ===== 作者 =====

    @Column({ type: 'uuid' })
    authorId: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'authorId' })
    author: Account;

    @Column({ type: 'varchar', length: 100 })
    authorName: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    authorAvatar?: string;

    // ===== 內容 =====

    @Column({ type: 'varchar', length: 200, nullable: true })
    title?: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'varchar', length: 20, default: 'general' })
    category: PostCategory;

    // 圖片 URLs（JSON 陣列）
    @Column({ type: 'simple-array', nullable: true })
    images?: string[];

    // 附加連結
    @Column({ type: 'varchar', length: 500, nullable: true })
    link?: string;

    // ===== 互動統計 =====

    @Column({ type: 'int', default: 0 })
    likeCount: number;

    @Column({ type: 'int', default: 0 })
    commentCount: number;

    @Column({ type: 'int', default: 0 })
    viewCount: number;

    // ===== 狀態 =====

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: PostStatus;

    // 置頂
    @Column({ type: 'boolean', default: false })
    isPinned: boolean;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // 關聯
    @OneToMany(() => PostComment, comment => comment.post)
    comments: PostComment[];

    @OneToMany(() => PostLike, like => like.post)
    likes: PostLike[];
}

// ===== 評論 =====
@Entity('post_comments')
export class PostComment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    postId: string;

    @ManyToOne(() => CommunityPost, post => post.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post: CommunityPost;

    // 回覆的評論（支援巢狀）
    @Column({ type: 'uuid', nullable: true })
    parentId?: string;

    @ManyToOne(() => PostComment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parentId' })
    parent?: PostComment;

    // ===== 作者 =====

    @Column({ type: 'uuid' })
    authorId: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'authorId' })
    author: Account;

    @Column({ type: 'varchar', length: 100 })
    authorName: string;

    // ===== 內容 =====

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'int', default: 0 })
    likeCount: number;

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: 'active' | 'hidden' | 'deleted';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// ===== 按讚 =====
@Entity('post_likes')
export class PostLike {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    postId: string;

    @ManyToOne(() => CommunityPost, post => post.likes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post: CommunityPost;

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => Account, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: Account;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
