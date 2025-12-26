import {
    Entity,
    Column,
    PrimaryColumn,
    UpdateDateColumn,
    CreateDateColumn,
} from 'typeorm';

@Entity('menu_configs')
export class MenuConfig {
    @PrimaryColumn()
    id: string; // matches nav item id (e.g., 'dashboard', 'events')

    @Column()
    label: string;

    @Column({ type: 'int', default: 0 })
    order: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
