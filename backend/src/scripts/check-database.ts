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
    synchronize: false,
    logging: false,
});

async function checkDatabase() {
    console.log('='.repeat(60));
    console.log('[DB Check] Connecting to database...');
    console.log(`[DB Check] Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`[DB Check] Database: ${process.env.DB_DATABASE || 'lightkeepers'}`);
    console.log('='.repeat(60));

    try {
        await AppDataSource.initialize();
        console.log('[DB Check] ✓ Connected\n');

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        // 檢查 accounts 表
        console.log('Checking accounts table...');
        const accountsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'accounts'
            );
        `);
        console.log(`  accounts table exists: ${accountsExists[0].exists}`);

        // 檢查 volunteers 表
        console.log('Checking volunteers table...');
        const volunteersExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'volunteers'
            );
        `);
        console.log(`  volunteers table exists: ${volunteersExists[0].exists}`);

        // 檢查 roles 表
        console.log('Checking roles table...');
        const rolesExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `);
        console.log(`  roles table exists: ${rolesExists[0].exists}`);

        // 列出所有表
        console.log('\nAll tables in database:');
        const tables = await queryRunner.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.table(tables);

        await queryRunner.release();
        await AppDataSource.destroy();

        if (!accountsExists[0].exists || !volunteersExists[0].exists) {
            console.log('\n' + '='.repeat(60));
            console.log('[DB Check] ⚠ WARNING: Required tables not found!');
            console.log('[DB Check] You need to run schema synchronization first.');
            console.log('[DB Check] Set SYNC_TABLES=true in .env and restart the app.');
            console.log('='.repeat(60));
        } else {
            console.log('\n' + '='.repeat(60));
            console.log('[DB Check] ✅ All required tables exist');
            console.log('[DB Check] Ready to run migration');
            console.log('='.repeat(60));
        }

        process.exit(0);

    } catch (error) {
        console.error('\n[DB Check] ❌ Error:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

checkDatabase();
