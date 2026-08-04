import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDomainEventsOutbox1736617000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'domain_events_outbox',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'event_type',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'aggregate_type',
                        type: 'enum',
                        enum: ['Alert', 'Incident', 'Task', 'Resource', 'Person', 'Comms', 'Attachment'],
                    },
                    {
                        name: 'aggregate_id',
                        type: 'uuid',
                    },
                    {
                        name: 'payload',
                        type: 'jsonb',
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'published', 'failed'],
                        default: "'pending'",
                    },
                    {
                        name: 'retry_count',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'last_error',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'published_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'processed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        // Create indexes for efficient querying
        await queryRunner.createIndex(
            'domain_events_outbox',
            new TableIndex({
                name: 'IDX_domain_events_event_type',
                columnNames: ['event_type'],
            }),
        );

        await queryRunner.createIndex(
            'domain_events_outbox',
            new TableIndex({
                name: 'IDX_domain_events_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'domain_events_outbox',
            new TableIndex({
                name: 'IDX_domain_events_status_created',
                columnNames: ['status', 'created_at'],
            }),
        );

        await queryRunner.createIndex(
            'domain_events_outbox',
            new TableIndex({
                name: 'IDX_domain_events_aggregate',
                columnNames: ['aggregate_type', 'aggregate_id'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('domain_events_outbox');
    }
}
