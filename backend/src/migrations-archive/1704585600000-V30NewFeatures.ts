import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v3.0 Migration - 新增功能表
 */
export class V30NewFeatures1704585600000 implements MigrationInterface {
    name = 'V30NewFeatures1704585600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ============ E-Triage: 傷患表 ============
        await queryRunner.query(`
            CREATE TYPE "triage_level_enum" AS ENUM ('BLACK', 'RED', 'YELLOW', 'GREEN');
            CREATE TYPE "transport_status_enum" AS ENUM ('PENDING', 'IN_TRANSIT', 'ARRIVED');
            
            CREATE TABLE "victims" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "braceletId" varchar(50),
                "missionSessionId" varchar NOT NULL,
                "triageLevel" "triage_level_enum" NOT NULL DEFAULT 'GREEN',
                "canWalk" boolean NOT NULL DEFAULT false,
                "breathing" boolean NOT NULL DEFAULT true,
                "respiratoryRate" int,
                "hasRadialPulse" boolean NOT NULL DEFAULT true,
                "capillaryRefillTime" float,
                "canFollowCommands" boolean NOT NULL DEFAULT true,
                "description" text,
                "locationDescription" text,
                "locationCoordinates" json,
                "injuries" text,
                "transportStatus" "transport_status_enum" NOT NULL DEFAULT 'PENDING',
                "hospitalId" varchar,
                "hospitalName" varchar(100),
                "ambulanceId" varchar,
                "photoUrls" text[],
                "assessorId" varchar,
                "assessorName" varchar(100),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_victims" PRIMARY KEY ("id")
            );
            CREATE INDEX "IDX_victims_missionSession" ON "victims" ("missionSessionId");
            CREATE INDEX "IDX_victims_triageLevel" ON "victims" ("triageLevel");
            CREATE INDEX "IDX_victims_braceletId" ON "victims" ("braceletId");
        `);

        // ============ E-Triage: 醫療記錄表 ============
        await queryRunner.query(`
            CREATE TYPE "treatment_type_enum" AS ENUM (
                'AIRWAY', 'BREATHING', 'CIRCULATION', 'MEDICATION', 
                'BANDAGE', 'SPLINT', 'IV', 'CPR', 'OTHER', 'RE_TRIAGE', 'TRANSPORT_UPDATE'
            );
            
            CREATE TABLE "medical_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "victimId" uuid NOT NULL,
                "missionSessionId" varchar NOT NULL,
                "treatmentType" "treatment_type_enum" NOT NULL,
                "description" text NOT NULL,
                "performerId" varchar,
                "performerName" varchar(100),
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "metadata" json,
                CONSTRAINT "PK_medical_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_medical_logs_victim" FOREIGN KEY ("victimId") REFERENCES "victims"("id") ON DELETE CASCADE
            );
            CREATE INDEX "IDX_medical_logs_victimId" ON "medical_logs" ("victimId");
        `);

        // ============ Family Reunification: 失蹤者表 ============
        await queryRunner.query(`
            CREATE TYPE "missing_person_status_enum" AS ENUM (
                'MISSING', 'FOUND_SAFE', 'FOUND_INJURED', 'FOUND_DECEASED', 'REUNITED'
            );

            CREATE TABLE "missing_persons" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "missionSessionId" varchar NOT NULL,
                "name" varchar(100) NOT NULL,
                "age" int,
                "gender" varchar(10),
                "description" text,
                "lastKnownLocation" text,
                "lastKnownCoordinates" json,
                "lastSeenAt" TIMESTAMP,
                "photoUrls" text[] DEFAULT '{}',
                "contactPhone" varchar(50),
                "status" "missing_person_status_enum" NOT NULL DEFAULT 'MISSING',
                "foundLocation" text,
                "foundCoordinates" json,
                "foundAt" TIMESTAMP,
                "foundByVolunteerId" varchar,
                "foundByVolunteerName" varchar(100),
                "reporterName" varchar(100),
                "reporterPhone" varchar(50),
                "reporterRelation" varchar(100),
                "queryCode" varchar(20) NOT NULL,
                "isPublic" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_missing_persons" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_missing_persons_queryCode" UNIQUE ("queryCode")
            );
            CREATE INDEX "IDX_missing_persons_missionSession" ON "missing_persons" ("missionSessionId");
            CREATE INDEX "IDX_missing_persons_status" ON "missing_persons" ("status");
            CREATE INDEX "IDX_missing_persons_queryCode" ON "missing_persons" ("queryCode");
        `);

        // ============ Equipment: 設備表 ============
        await queryRunner.query(`
            CREATE TYPE "equipment_status_enum" AS ENUM (
                'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'CHARGING', 'DAMAGED', 'RETIRED'
            );
            CREATE TYPE "equipment_category_enum" AS ENUM (
                'RADIO', 'GPS', 'TABLET', 'DRONE', 'FIRST_AID', 'LIGHT', 'POWER_BANK', 'OTHER'
            );

            CREATE TABLE "equipment" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(100) NOT NULL,
                "serialNumber" varchar(50) NOT NULL,
                "qrCode" varchar(50),
                "category" "equipment_category_enum" NOT NULL DEFAULT 'OTHER',
                "status" "equipment_status_enum" NOT NULL DEFAULT 'AVAILABLE',
                "batteryLevel" int,
                "batteryHealth" int,
                "lastCharged" TIMESTAMP,
                "lastMaintenanceDate" date,
                "nextMaintenanceDate" date,
                "maintenanceIntervalDays" int NOT NULL DEFAULT 90,
                "currentHolderId" varchar,
                "currentHolderName" varchar(100),
                "checkedOutAt" TIMESTAMP,
                "expectedReturnAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_equipment" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_equipment_serialNumber" UNIQUE ("serialNumber")
            );
            CREATE INDEX "IDX_equipment_serialNumber" ON "equipment" ("serialNumber");
            CREATE INDEX "IDX_equipment_qrCode" ON "equipment" ("qrCode");
            CREATE INDEX "IDX_equipment_category" ON "equipment" ("category");
            CREATE INDEX "IDX_equipment_status" ON "equipment" ("status");
        `);

        // ============ Equipment: 設備記錄表 ============
        await queryRunner.query(`
            CREATE TYPE "equipment_log_type_enum" AS ENUM (
                'CHECKOUT', 'RETURN', 'MAINTENANCE_START', 'MAINTENANCE_END', 
                'BATTERY_UPDATE', 'STATUS_CHANGE', 'NOTE'
            );

            CREATE TABLE "equipment_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "equipmentId" uuid NOT NULL,
                "type" "equipment_log_type_enum" NOT NULL,
                "description" text NOT NULL,
                "performerId" varchar,
                "performerName" varchar(100),
                "metadata" json,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_equipment_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_equipment_logs_equipment" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE
            );
            CREATE INDEX "IDX_equipment_logs_equipmentId" ON "equipment_logs" ("equipmentId");
        `);

        // ============ Tactical Maps: 戰術標記表 ============
        await queryRunner.query(`
            CREATE TYPE "marker_category_enum" AS ENUM (
                'FRIENDLY', 'HOSTILE', 'NEUTRAL', 'UNKNOWN', 'INFRASTRUCTURE', 'OBJECTIVE', 'HAZARD'
            );
            CREATE TYPE "marker_type_enum" AS ENUM (
                'UNIT', 'VEHICLE', 'AIRCRAFT', 'WAYPOINT', 'RALLY_POINT', 'COMMAND_POST',
                'MEDICAL', 'SUPPLY', 'BOUNDARY', 'ROUTE', 'AREA', 'LINE', 'POINT'
            );

            CREATE TABLE "tactical_markers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "missionSessionId" varchar NOT NULL,
                "name" varchar(100) NOT NULL,
                "category" "marker_category_enum" NOT NULL DEFAULT 'FRIENDLY',
                "type" "marker_type_enum" NOT NULL DEFAULT 'POINT',
                "longitude" float NOT NULL,
                "latitude" float NOT NULL,
                "altitude" float,
                "geometry" json,
                "height" float,
                "model3dUrl" varchar(255),
                "viewshedParams" json,
                "color" varchar(20) NOT NULL DEFAULT '#3b82f6',
                "iconUrl" varchar(100),
                "opacity" float NOT NULL DEFAULT 1.0,
                "isVisible" boolean NOT NULL DEFAULT true,
                "sidc" varchar(30),
                "description" text,
                "metadata" json,
                "createdBy" varchar,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tactical_markers" PRIMARY KEY ("id")
            );
            CREATE INDEX "IDX_tactical_markers_missionSession" ON "tactical_markers" ("missionSessionId");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "tactical_markers"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "equipment_logs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "equipment"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "missing_persons"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "medical_logs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "victims"`);

        await queryRunner.query(`DROP TYPE IF EXISTS "marker_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "marker_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "equipment_log_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "equipment_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "equipment_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "missing_person_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "treatment_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "transport_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "triage_level_enum"`);
    }
}
