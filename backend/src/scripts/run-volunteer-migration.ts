import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'lightkeepers',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
    logging: true,
});

async function runMigration() {
    console.log('='.repeat(60));
    console.log('[Migration] Connecting to database...');
    console.log(`[Migration] Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`[Migration] Database: ${process.env.DB_DATABASE || 'lightkeepers'}`);
    console.log('='.repeat(60));

    try {
        await AppDataSource.initialize();
        console.log('[Migration] ✓ Database connected');

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        console.log('\n' + '='.repeat(60));
        console.log('[Migration] Starting: AddVolunteerAccountRelation');
        console.log('='.repeat(60));

        // 1. 添加外鍵約束
        console.log('\n[Step 1/2] Adding foreign key constraint FK_volunteers_account...');
        try {
            await queryRunner.query(`
                ALTER TABLE "volunteers" 
                ADD CONSTRAINT "FK_volunteers_account" 
                FOREIGN KEY ("account_id") 
                REFERENCES "accounts"("id") 
                ON DELETE SET NULL
            `);
            console.log('[Step 1/2] ✓ Foreign key constraint added successfully');
        } catch (error: any) {
            if (error.code === '42P07' || error.message.includes('already exists')) {
                console.log('[Step 1/2] ⚠ Foreign key constraint already exists, skipping...');
            } else {
                throw error;
            }
        }

        // 2. 為現有的已審核志工自動分配 volunteer role
        console.log('\n[Step 2/2] Syncing approved volunteers with volunteer role...');
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
            RETURNING account_id
        `);
        console.log(`[Step 2/2] ✓ Synced ${result.length} approved volunteers with volunteer role`);

        // 驗證結果
        console.log('\n' + '='.repeat(60));
        console.log('[Verification] Checking results...');
        console.log('='.repeat(60));

        const verifyQuery = await queryRunner.query(`
            SELECT 
                v.id,
                v.name,
                v.volunteer_code,
                v.approval_status,
                a.email,
                r.name as role_name,
                r.level as role_level
            FROM volunteers v
            LEFT JOIN accounts a ON v.account_id = a.id
            LEFT JOIN account_roles ar ON a.id = ar.account_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE v.approval_status = 'approved'
            LIMIT 5
        `);

        console.log('\nSample approved volunteers with roles:');
        console.table(verifyQuery);

        await queryRunner.release();

        console.log('\n' + '='.repeat(60));
        console.log('[Migration] ✅ COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));

        await AppDataSource.destroy();
        process.exit(0);

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('[Migration] ❌ FAILED');
        console.error('='.repeat(60));
        console.error('Error:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

runMigration();
