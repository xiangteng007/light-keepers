import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CD-1 / C1.1 — 民防災型擴充（D16 民防韌性）
 * ---------------------------------------------------------------------------
 * 設計文件：docs/architecture/CIVIL_DEFENSE_TAXONOMY.md
 *
 * 為什麼**沒有** ALTER TYPE：
 *   `reports.type` 在 entity 是 `@Column({ type: 'varchar', length: 50 })`，
 *   DB 端就是 varchar(50)，**不是** PostgreSQL enum。因此新增
 *   air_raid / explosion / terror_attack / cbrn 四個災型值在 DB 層是 no-op
 *   （最長的 'terror_attack' 只有 13 字元）。既有列一列都不需要 UPDATE。
 *
 * 若哪天真的要對 PostgreSQL enum 加值（例如 intake_reports_sourcetype_enum），
 * 正確語法與三個必知陷阱：
 *
 *   ALTER TYPE "public"."intake_reports_sourcetype_enum" ADD VALUE IF NOT EXISTS 'air_raid';
 *
 *   1. PG < 12 不允許在交易區塊內執行 ADD VALUE。TypeORM 預設把 migration 包在
 *      交易裡，舊版需拆交易或把 migration 標成非交易式。PG 12+ 已放寬。
 *   2. 即使 PG 12+，同一交易內不得**使用**剛加入的值（不能 ADD VALUE 之後立刻
 *      UPDATE ... SET x = 'air_raid'），必須拆成兩支 migration。
 *   3. PostgreSQL 沒有 DROP VALUE，enum 值無法在 down() 移除；回滾只能重建整個
 *      type 並改寫所有引用欄位。這是本專案災型刻意維持 varchar 的實務理由之一。
 *
 * 本 migration 實際做的事只有大量傷患（MCI）旗標欄位與兩個索引。
 * MCI 做成旗標而非 enum 值的取捨論證見設計文件 §2.2。
 *
 * ⚠️ 本檔依 C1.1 指示**只寫不執行**，待 D7/D15 的 migration 窗口統一排程。
 */
export class AddCivilDefenseDisasterTypes1754029200000 implements MigrationInterface {
    name = 'AddCivilDefenseDisasterTypes1754029200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 大量傷患旗標：NOT NULL DEFAULT false → 既有列全部落在原本的行為分支
        await queryRunner.query(
            `ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "isMassCasualty" boolean NOT NULL DEFAULT false`,
        );
        // 概估傷患人數（通報者常只能給大概數字，允許 NULL）
        await queryRunner.query(
            `ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "casualtyEstimate" integer`,
        );

        // 災型篩選索引：災型從 8 類變 12 類後，報表/地圖的 type 篩選選擇度提高
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_reports_type" ON "reports" ("type")`,
        );
        // MCI 是稀疏事件 → partial index，只索引 true 的列
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_reports_mass_casualty" ON "reports" ("isMassCasualty") WHERE "isMassCasualty" = true`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reports_mass_casualty"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reports_type"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN IF EXISTS "casualtyEstimate"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN IF EXISTS "isMassCasualty"`);
        // 災型值本身沒有 DDL 可回滾（varchar 欄位）。若有列已寫入民防災型值，
        // 回滾後這些列的 type 仍會是 'air_raid' 等值——這是 varchar 設計的已知
        // 取捨，回滾前應先確認資料處置方式。
    }
}
