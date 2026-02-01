import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Add Staff Security Tables
 * 
 * Creates tables for P0 Staff Security module:
 * - security_incidents: Security incident tracking
 * - staff_checkins: Staff check-in and panic button
 */
export class AddStaffSecurityTables1706803200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create security_incidents table
        await queryRunner.createTable(
            new Table({
                name: 'security_incidents',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'severity',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'description',
                        type: 'text',
                    },
                    {
                        name: 'latitude',
                        type: 'decimal',
                        precision: 10,
                        scale: 7,
                        isNullable: true,
                    },
                    {
                        name: 'longitude',
                        type: 'decimal',
                        precision: 10,
                        scale: 7,
                        isNullable: true,
                    },
                    {
                        name: 'address',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'affectedStaffIds',
                        type: 'text',
                        isNullable: true,
                        comment: 'Comma-separated list of affected staff IDs',
                    },
                    {
                        name: 'reporterId',
                        type: 'uuid',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '30',
                        default: "'reported'",
                    },
                    {
                        name: 'resolution',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'reportedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'resolvedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        // Create indexes for security_incidents
        await queryRunner.createIndex(
            'security_incidents',
            new TableIndex({
                name: 'IDX_security_incidents_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'security_incidents',
            new TableIndex({
                name: 'IDX_security_incidents_severity',
                columnNames: ['severity'],
            }),
        );

        await queryRunner.createIndex(
            'security_incidents',
            new TableIndex({
                name: 'IDX_security_incidents_reportedAt',
                columnNames: ['reportedAt'],
            }),
        );

        // Create staff_checkins table
        await queryRunner.createTable(
            new Table({
                name: 'staff_checkins',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'staffId',
                        type: 'uuid',
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '30',
                        comment: 'routine, arrival, departure, panic, wellness',
                    },
                    {
                        name: 'latitude',
                        type: 'decimal',
                        precision: 10,
                        scale: 7,
                        isNullable: true,
                    },
                    {
                        name: 'longitude',
                        type: 'decimal',
                        precision: 10,
                        scale: 7,
                        isNullable: true,
                    },
                    {
                        name: 'accuracy',
                        type: 'decimal',
                        precision: 5,
                        scale: 1,
                        isNullable: true,
                        comment: 'GPS accuracy in meters',
                    },
                    {
                        name: 'message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'missionId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'checkedInAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes for staff_checkins
        await queryRunner.createIndex(
            'staff_checkins',
            new TableIndex({
                name: 'IDX_staff_checkins_staffId',
                columnNames: ['staffId'],
            }),
        );

        await queryRunner.createIndex(
            'staff_checkins',
            new TableIndex({
                name: 'IDX_staff_checkins_type',
                columnNames: ['type'],
            }),
        );

        await queryRunner.createIndex(
            'staff_checkins',
            new TableIndex({
                name: 'IDX_staff_checkins_checkedInAt',
                columnNames: ['checkedInAt'],
            }),
        );

        await queryRunner.createIndex(
            'staff_checkins',
            new TableIndex({
                name: 'IDX_staff_checkins_missionId',
                columnNames: ['missionId'],
            }),
        );

        console.log('✅ Created staff security tables: security_incidents, staff_checkins');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('staff_checkins', 'IDX_staff_checkins_missionId');
        await queryRunner.dropIndex('staff_checkins', 'IDX_staff_checkins_checkedInAt');
        await queryRunner.dropIndex('staff_checkins', 'IDX_staff_checkins_type');
        await queryRunner.dropIndex('staff_checkins', 'IDX_staff_checkins_staffId');
        await queryRunner.dropIndex('security_incidents', 'IDX_security_incidents_reportedAt');
        await queryRunner.dropIndex('security_incidents', 'IDX_security_incidents_severity');
        await queryRunner.dropIndex('security_incidents', 'IDX_security_incidents_status');

        // Drop tables
        await queryRunner.dropTable('staff_checkins');
        await queryRunner.dropTable('security_incidents');

        console.log('⬇️ Dropped staff security tables');
    }
}
