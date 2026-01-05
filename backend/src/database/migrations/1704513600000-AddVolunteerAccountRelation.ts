import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVolunteerAccountRelation1704513600000 implements MigrationInterface {
    name = 'AddVolunteerAccountRelation1704513600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // 1. 添加外鍵約束 (ON DELETE SET NULL - 刪除 Account 時不刪除 Volunteer 資料)
            console.log('[Migration] Adding foreign key constraint FK_volunteers_account...');
            await queryRunner.query(`
                ALTER TABLE "volunteers" 
                ADD CONSTRAINT "FK_volunteers_account" 
                FOREIGN KEY ("account_id") 
                REFERENCES "accounts"("id") 
                ON DELETE SET NULL
            `);
            console.log('[Migration] Foreign key constraint added successfully');

            // 2. 為現有的已審核志工自動分配 volunteer role
            console.log('[Migration] Syncing approved volunteers with volunteer role...');
            const result = await queryRunner.query(`
                WITH approved_volunteers AS (
                    SELECT account_id 
                    FROM volunteers 
                    WHERE approval_status = 'approved' 
                    AND account_id IS NOT NULL
                )
                INSERT INTO account_roles (account_id, role_id)
                SELECT av.account_id, r.id
                FROM approved_volunteers av
                CROSS JOIN roles r
                WHERE r.name = 'volunteer'
                ON CONFLICT DO NOTHING
                RETURNING *
            `);
            console.log(`[Migration] Synced ${result.length} approved volunteers with volunteer role`);

        } catch (error) {
            console.error('[Migration] Error during up migration:', error);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            // 移除外鍵約束
            console.log('[Migration] Removing foreign key constraint FK_volunteers_account...');
            await queryRunner.query(`
                ALTER TABLE "volunteers" 
                DROP CONSTRAINT IF EXISTS "FK_volunteers_account"
            `);
            console.log('[Migration] Foreign key constraint removed');

        } catch (error) {
            console.error('[Migration] Error during down migration:', error);
            throw error;
        }
    }
}
