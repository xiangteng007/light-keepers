import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('org_nodes')
@Index(['parentId'])
export class OrgNode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    type: 'organization' | 'division' | 'branch' | 'team' | 'unit';

    @Column({ type: 'uuid', nullable: true })
    @Index()
    parentId: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    managerId: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    managerName: string;

    @Column({ type: 'int', default: 0 })
    memberCount: number;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'varchar', length: 200, nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    code: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
