import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * C1.2 / CD-2 防空避難設施資料介接
 *
 * 新增 `air_raid_shelters` 資料表，儲存內政部警政署「防空避難處所」開放資料
 * (data.gov.tw)。與既有 `shelters` 資料表（收容所，長期收容/安置）刻意分離，
 * 兩者代表不同性質的避難設施，詳見
 * backend/src/modules/public-resources/entities/air-raid-shelter.entity.ts 註解。
 *
 * 注意：此 migration 檔僅撰寫，依任務要求不執行（不對外部資料庫套用）。
 */
export class AddAirRaidShelters1785545521552 implements MigrationInterface {
    name = 'AddAirRaidShelters1785545521552'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "air_raid_shelters" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sourceId" character varying,
                "name" character varying NOT NULL,
                "city" character varying,
                "district" character varying,
                "address" character varying NOT NULL,
                "latitude" numeric(10,7),
                "longitude" numeric(10,7),
                "capacity" integer NOT NULL DEFAULT '0',
                "basementLevels" integer,
                "managingOrg" character varying,
                "contactPhone" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "isGeocoded" boolean NOT NULL DEFAULT false,
                "lastImportedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_air_raid_shelters_address" UNIQUE ("address"),
                CONSTRAINT "PK_air_raid_shelters_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_air_raid_shelters_lat_lng" ON "air_raid_shelters" ("latitude", "longitude")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_air_raid_shelters_city_district" ON "air_raid_shelters" ("city", "district")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_air_raid_shelters_city_district"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_air_raid_shelters_lat_lng"`);
        await queryRunner.query(`DROP TABLE "air_raid_shelters"`);
    }

}
