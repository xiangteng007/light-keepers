import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'lightkeepers',
    entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
    synchronize: true,  // ✅ This will create the volunteers table
    logging: ['error', 'warn', 'schema'],
});

async function syncVolunteersTable() {
    console.log('='.repeat(60));
    console.log('[Schema Sync] Creating volunteers table...');
    console.log('='.repeat(60));

    try {
        await AppDataSource.initialize();
        console.log('[Schema Sync] ✓ Database connected');
        console.log('[Schema Sync] ✓ Volunteers table synchronized');

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        // 驗證 volunteers 表已創建
        const tableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'volunteers'
            );
        `);

        if (tableExists[0].exists) {
            console.log('[Schema Sync] ✅ volunteers table created successfully\n');

            // 顯示表結構
            const columns = await queryRunner.query(
                `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'volunteers'
                ORDER BY ordinal_position;
            `);

            console.log('Table structure:');
            console.table(columns);
        }

        await queryRunner.release();
        await AppDataSource.destroy();

        console.log('\n' + '='.repeat(60));
        console.log('[Schema Sync] ✅ COMPLETED');
        console.log('[Schema Sync] Ready to run migration');
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('\n[Schema Sync] ❌ Error:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

syncVolunteersTable();
