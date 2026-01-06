import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMissionEventsTable1736124000000 implements MigrationInterface {
    name = 'RenameMissionEventsTable1736124000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if mission_sessions table exists first
        const missionSessionsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'mission_sessions'
            )
        `);

        if (!missionSessionsExists[0].exists) {
            console.log('mission_sessions table does not exist yet, creating it first...');

            // Create mission_sessions table if it doesn't exist
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS "mission_sessions" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "title" varchar(255) NOT NULL,
                    "description" text,
                    "status" varchar(20) NOT NULL DEFAULT 'preparing',
                    "commander_id" varchar,
                    "commander_name" varchar,
                    "metadata" jsonb,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "started_at" TIMESTAMP,
                    "ended_at" TIMESTAMP,
                    CONSTRAINT "PK_mission_sessions" PRIMARY KEY ("id")
                )
            `);
        }

        // Check if mission_events table already exists
        const missionEventsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'mission_events'
            )
        `);

        if (missionEventsExists[0].exists) {
            console.log('mission_events table already exists, skipping');
            return;
        }

        console.log('Creating mission_events table...');

        // Create the mission_events table
        await queryRunner.query(`
            CREATE TABLE "mission_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "session_id" uuid NOT NULL,
                "title" varchar(255) NOT NULL,
                "description" text,
                "type" varchar(20) NOT NULL DEFAULT 'info',
                "reporter_id" varchar,
                "reporter_name" varchar,
                "location" jsonb,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_mission_events" PRIMARY KEY ("id"),
                CONSTRAINT "FK_mission_events_session" FOREIGN KEY ("session_id") REFERENCES "mission_sessions"("id") ON DELETE CASCADE
            )
        `);

        // Create index
        await queryRunner.query(`
            CREATE INDEX "IDX_mission_events_session_id" ON "mission_events" ("session_id")
        `);

        console.log('mission_events table created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "mission_events"`);
    }
}
