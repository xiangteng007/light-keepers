const { DataSource } = require('typeorm');

async function fixSchema() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'localdev123',
        database: 'lightkeepers',
        synchronize: false,
    });

    await ds.initialize();
    console.log('Connected to database');

    // 檢查並添加缺少的列
    const columnsToAdd = [
        { name: 'line_user_id', type: 'varchar(255)', nullable: true },
        { name: 'line_display_name', type: 'varchar(255)', nullable: true },
        { name: 'google_id', type: 'varchar(255)', nullable: true },
        { name: 'google_email', type: 'varchar(255)', nullable: true },
        { name: 'firebase_uid', type: 'varchar(255)', nullable: true },
        { name: 'email_verified', type: 'boolean', default: 'false' },
        { name: 'phone_verified', type: 'boolean', default: 'false' },
        { name: 'volunteer_profile_completed', type: 'boolean', default: 'false' },
        { name: 'approval_status', type: 'varchar(50)', default: "'pending'" },
    ];

    for (const col of columnsToAdd) {
        try {
            const check = await ds.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = $1`,
                [col.name]
            );

            if (check.length === 0) {
                const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
                const nullClause = col.nullable ? ' NULL' : '';
                await ds.query(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.type}${nullClause}${defaultClause}`);
                console.log(`Added column: ${col.name}`);
            } else {
                console.log(`Column exists: ${col.name}`);
            }
        } catch (err) {
            console.log(`Error adding ${col.name}: ${err.message}`);
        }
    }

    // 為 roles 表添加缺少的列
    const roleColumns = [
        { name: 'display_name', type: 'varchar(255)', nullable: true },
        { name: 'level', type: 'integer', default: '0' },
    ];

    for (const col of roleColumns) {
        try {
            const check = await ds.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = 'roles' AND column_name = $1`,
                [col.name]
            );

            if (check.length === 0) {
                const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
                const nullClause = col.nullable ? ' NULL' : '';
                await ds.query(`ALTER TABLE roles ADD COLUMN ${col.name} ${col.type}${nullClause}${defaultClause}`);
                console.log(`Added roles column: ${col.name}`);
            } else {
                console.log(`Roles column exists: ${col.name}`);
            }
        } catch (err) {
            console.log(`Error adding roles.${col.name}: ${err.message}`);
        }
    }

    // 更新 owner 角色
    await ds.query(`UPDATE roles SET level = 5, display_name = '系統擁有者' WHERE name = 'owner'`);
    console.log('Updated owner role');

    await ds.destroy();
    console.log('\n✅ Schema fix complete!');
}

fixSchema().catch(console.error);
