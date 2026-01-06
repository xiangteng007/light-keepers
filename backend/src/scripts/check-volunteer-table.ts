import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'lightkeepers',
    synchronize: false,
    logging: false,
});

async function analyzeVolunteerProfilesTable() {
    try {
        await AppDataSource.initialize();
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        console.log('='.repeat(60));
        console.log('Analyzing volunteer_profiles table');
        console.log('='.repeat(60));

        // 檢查表結構
        const columns = await queryRunner.query(`
            SELECT 
                column_name, 
                data_type, 
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'volunteer_profiles'
            ORDER BY ordinal_position;
        `);

        console.log('\nTable Structure:');
        console.table(columns);

        // 檢查是否有資料
        const count = await queryRunner.query(`
            SELECT COUNT(*) as total FROM volunteer_profiles;
        `);
        console.log(`\nTotal records: ${count[0].total}`);

        // 檢查關鍵欄位
        const keyColumns = ['id', 'account_id', 'approval_status', 'volunteer_code'];
        console.log('\nKey columns check:');
        keyColumns.forEach(col => {
            const exists = columns.some((c: any) => c.column_name === col);
            console.log(`  ${col}: ${exists ? '✓' : '✗'}`);
        });

        // 樣本資料
        const sample = await queryRunner.query(`
            SELECT id, account_id, approval_status, created_at
            FROM volunteer_profiles
            LIMIT 3;
        `);
        console.log('\nSample data:');
        console.table(sample);

        await queryRunner.release();
        await AppDataSource.destroy();

        console.log('\n' + '='.repeat(60));
        console.log('RECOMMENDATION:');
        console.log('='.repeat(60));
        console.log('Update volunteers.entity.ts to use @Entity("volunteer_profiles")');
        console.log('This will work with the existing database schema.');
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

analyzeVolunteerProfilesTable();
