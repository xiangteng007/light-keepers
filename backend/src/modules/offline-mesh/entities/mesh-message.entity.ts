/**
 * 離線網狀訊息實體 (Mesh Message Entity)
 * 模組 B: 離線網狀中繼站
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export interface MeshLocation {
    lat: number;
    lng: number;
    alt?: number;
}

@Entity('mesh_messages')
export class MeshMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    nodeId: string; // LoRa 硬體 ID

    @Column()
    content: string;

    @Column({ type: 'json', nullable: true })
    location: MeshLocation;

    @Column({ type: 'float', nullable: true })
    snr: number; // Signal-to-Noise Ratio

    @Column({ type: 'float', nullable: true })
    rssi: number; // Received Signal Strength Indication

    @Column({ default: false })
    @Index()
    isSynced: boolean;

    @Column({ default: false })
    isProcessed: boolean; // 是否已轉換為 SOS 請求

    @Column({ nullable: true })
    linkedSosId: string; // 關聯的 SOS 請求 ID

    @Column()
    receivedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}

// LoRa 節點狀態
@Entity('mesh_nodes')
export class MeshNode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    nodeId: string;

    @Column({ nullable: true })
    name: string;

    @Column({ type: 'json', nullable: true })
    lastLocation: MeshLocation;

    @Column({ nullable: true })
    lastSeen: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    messageCount: number;

    @Column({ type: 'float', nullable: true })
    batteryLevel: number; // 0-100

    @CreateDateColumn()
    createdAt: Date;
}
