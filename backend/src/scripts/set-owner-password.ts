import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

const OWNER_EMAIL = 'xiangteng007@gmail.com';
const NEW_PASSWORD = 'LightKeepers2026!';

async function setOwnerPassword() {
    console.log('Connecting to database...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'lightkeepers',
        ssl: false,
    });

    try {
        await dataSource.initialize();
        console.log('Connected to database');

        // Hash the password
        const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
        console.log('Password hash generated');

        // Update the owner account
        const result = await dataSource.query(
            'UPDATE accounts SET password_hash = $1 WHERE email = $2 RETURNING id, email, display_name',
            [passwordHash, OWNER_EMAIL]
        );

        if (result.length > 0) {
            console.log('✅ Password set successfully for:', result[0].email);
            console.log('   Display Name:', result[0].display_name);
            console.log('');
            console.log('🔐 New credentials:');
            console.log(`   Email: ${OWNER_EMAIL}`);
            console.log(`   Password: ${NEW_PASSWORD}`);
        } else {
            console.log('❌ Account not found:', OWNER_EMAIL);
        }

        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

setOwnerPassword();
