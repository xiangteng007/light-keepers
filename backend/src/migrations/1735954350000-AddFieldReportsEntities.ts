import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldReportsEntities1735954350000 implements MigrationInterface {
    name = 'AddFieldReportsEntities1735954350000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable PostGIS extension if not exists
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

        // 1. field_reports table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "field_reports" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "mission_session_id" uuid NOT NULL,
                "reporter_user_id" varchar(128) NOT NULL,
                "reporter_name" varchar(100) NOT NULL,
                "type" varchar(50) NOT NULL DEFAULT 'other',
                "category" varchar(100),
                "severity" smallint NOT NULL DEFAULT 2,
                "confidence" smallint NOT NULL DEFAULT 50,
                "status" varchar(50) NOT NULL DEFAULT 'new',
                "message" text,
                "geom" geometry(Point, 4326) NOT NULL,
                "accuracy_m" real,
                "occurred_at" timestamp with time zone DEFAULT now(),
                "attachments_count" integer NOT NULL DEFAULT 0,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "version" integer NOT NULL DEFAULT 1,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now(),
                "updated_by" varchar(128),
                "deleted_at" timestamp with time zone
            );
            
            CREATE INDEX IF NOT EXISTS "idx_field_reports_mission_session" ON "field_reports" ("mission_session_id");
            CREATE INDEX IF NOT EXISTS "idx_field_reports_geom" ON "field_reports" USING GIST ("geom");
            CREATE INDEX IF NOT EXISTS "idx_field_reports_status" ON "field_reports" ("status");
            CREATE INDEX IF NOT EXISTS "idx_field_reports_updated_at" ON "field_reports" ("updated_at");
        `);

        // 2. report_attachments table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "report_attachments" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "report_id" uuid NOT NULL REFERENCES "field_reports"("id") ON DELETE CASCADE,
                "mission_session_id" uuid NOT NULL,
                "kind" varchar(20) NOT NULL DEFAULT 'photo',
                "mime" varchar(100) NOT NULL,
                "size" bigint NOT NULL DEFAULT 0,
                "sha256" varchar(64),
                "original_filename" varchar(255),
                "gcs_path" varchar(512),
                "thumbnail_path" varchar(512),
                "upload_status" varchar(20) NOT NULL DEFAULT 'pending',
                "captured_at" timestamp with time zone,
                "photo_geom" geometry(Point, 4326),
                "photo_accuracy_m" real,
                "location_source" varchar(20) DEFAULT 'unknown',
                "show_on_map" boolean NOT NULL DEFAULT false,
                "exif_json" jsonb,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now(),
                "deleted_at" timestamp with time zone
            );
            
            CREATE INDEX IF NOT EXISTS "idx_attachments_report" ON "report_attachments" ("report_id");
            CREATE INDEX IF NOT EXISTS "idx_attachments_photo_geom" ON "report_attachments" USING GIST ("photo_geom") WHERE "photo_geom" IS NOT NULL;
            CREATE INDEX IF NOT EXISTS "idx_attachments_show_on_map" ON "report_attachments" ("show_on_map") WHERE "show_on_map" = true;
        `);

        // 3. sos_signals table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sos_signals" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "mission_session_id" uuid NOT NULL,
                "report_id" uuid REFERENCES "field_reports"("id") ON DELETE SET NULL,
                "user_id" varchar(128) NOT NULL,
                "user_name" varchar(100) NOT NULL,
                "status" varchar(20) NOT NULL DEFAULT 'active',
                "trigger_geom" geometry(Point, 4326) NOT NULL,
                "trigger_accuracy_m" real,
                "last_geom" geometry(Point, 4326),
                "last_accuracy_m" real,
                "last_at" timestamp with time zone,
                "acked_by" varchar(128),
                "acked_at" timestamp with time zone,
                "resolved_by" varchar(128),
                "resolved_at" timestamp with time zone,
                "resolution_note" text,
                "ttl_expires_at" timestamp with time zone,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now()
            );
            
            CREATE INDEX IF NOT EXISTS "idx_sos_mission_session" ON "sos_signals" ("mission_session_id");
            CREATE INDEX IF NOT EXISTS "idx_sos_status" ON "sos_signals" ("status") WHERE "status" = 'active';
            CREATE INDEX IF NOT EXISTS "idx_sos_trigger_geom" ON "sos_signals" USING GIST ("trigger_geom");
        `);

        // 4. live_location_shares table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "live_location_shares" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" varchar(128) NOT NULL,
                "user_name" varchar(100) NOT NULL,
                "callsign" varchar(20),
                "mission_session_id" uuid NOT NULL,
                "mode" varchar(20) NOT NULL DEFAULT 'off',
                "is_enabled" boolean NOT NULL DEFAULT false,
                "last_geom" geometry(Point, 4326),
                "last_accuracy_m" real,
                "last_heading" real,
                "last_speed" real,
                "last_at" timestamp with time zone,
                "started_at" timestamp with time zone,
                "ended_at" timestamp with time zone,
                "ttl_expires_at" timestamp with time zone,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now()
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_location_share_user_session" ON "live_location_shares" ("user_id", "mission_session_id");
            CREATE INDEX IF NOT EXISTS "idx_location_share_enabled" ON "live_location_shares" ("is_enabled") WHERE "is_enabled" = true;
            CREATE INDEX IF NOT EXISTS "idx_location_share_geom" ON "live_location_shares" USING GIST ("last_geom") WHERE "last_geom" IS NOT NULL;
        `);

        // 5. location_history table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "location_history" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" varchar(128) NOT NULL,
                "mission_session_id" uuid NOT NULL,
                "geom" geometry(Point, 4326) NOT NULL,
                "accuracy_m" real,
                "heading" real,
                "speed" real,
                "created_at" timestamp with time zone DEFAULT now()
            );
            
            CREATE INDEX IF NOT EXISTS "idx_location_history_user_session" ON "location_history" ("user_id", "mission_session_id");
            CREATE INDEX IF NOT EXISTS "idx_location_history_geom" ON "location_history" USING GIST ("geom");
            CREATE INDEX IF NOT EXISTS "idx_location_history_created_at" ON "location_history" ("created_at" DESC);
        `);

        // 6. task_claims table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "task_claims" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "task_id" uuid NOT NULL,
                "claimed_by" varchar(128) NOT NULL,
                "claimed_at" timestamp with time zone DEFAULT now(),
                "released_at" timestamp with time zone,
                "created_at" timestamp with time zone DEFAULT now()
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_claims_task" ON "task_claims" ("task_id") WHERE "released_at" IS NULL;
        `);

        // 7. task_progress_updates table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "task_progress_updates" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "task_id" uuid NOT NULL,
                "user_id" varchar(128) NOT NULL,
                "user_name" varchar(100) NOT NULL,
                "status" varchar(50) NOT NULL DEFAULT 'update',
                "message" text,
                "attachments" jsonb NOT NULL DEFAULT '[]',
                "created_at" timestamp with time zone DEFAULT now()
            );
            
            CREATE INDEX IF NOT EXISTS "idx_task_progress_task" ON "task_progress_updates" ("task_id");
        `);

        // 8. audit_logs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "audit_logs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "actor_user_id" varchar(128) NOT NULL,
                "actor_name" varchar(100),
                "action" varchar(100) NOT NULL,
                "entity_type" varchar(50) NOT NULL,
                "entity_id" varchar(128) NOT NULL,
                "mission_session_id" uuid,
                "before_snapshot" jsonb,
                "after_snapshot" jsonb,
                "ip_address" varchar(45),
                "user_agent" text,
                "created_at" timestamp with time zone DEFAULT now()
            );
            
            CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
            CREATE INDEX IF NOT EXISTS "idx_audit_logs_mission_session" ON "audit_logs" ("mission_session_id") WHERE "mission_session_id" IS NOT NULL;
            CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at" DESC);
        `);

        // 9. entity_locks table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "entity_locks" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "entity_type" varchar(50) NOT NULL,
                "entity_id" varchar(128) NOT NULL,
                "locked_by" varchar(128) NOT NULL,
                "locked_at" timestamp with time zone DEFAULT now(),
                "expires_at" timestamp with time zone NOT NULL
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_entity_locks_entity" ON "entity_locks" ("entity_type", "entity_id");
        `);

        console.log('✅ Field Reports entities migration completed');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "entity_locks" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "task_progress_updates" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "task_claims" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "location_history" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "live_location_shares" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sos_signals" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "report_attachments" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "field_reports" CASCADE;`);

        console.log('✅ Field Reports entities rollback completed');
    }
}
