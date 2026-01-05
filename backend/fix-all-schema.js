const { DataSource } = require('typeorm');

async function fixAllColumns() {
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

    // 所有 accounts 表需要的列
    const accountColumns = [
        // LINE/Google/Firebase
        { name: 'line_user_id', def: 'varchar(50) NULL' },
        { name: 'line_display_name', def: 'varchar(100) NULL' },
        { name: 'google_id', def: 'varchar(50) NULL' },
        { name: 'google_email', def: 'varchar(255) NULL' },
        { name: 'firebase_uid', def: 'varchar(128) NULL' },
        // 驗證狀態
        { name: 'email_verified', def: 'boolean DEFAULT false' },
        { name: 'phone_verified', def: 'boolean DEFAULT false' },
        // 通知偏好
        { name: 'pref_alert_notifications', def: 'boolean DEFAULT true' },
        { name: 'pref_task_notifications', def: 'boolean DEFAULT true' },
        { name: 'pref_training_notifications', def: 'boolean DEFAULT true' },
        // 審核
        { name: 'approval_status', def: "varchar(20) DEFAULT 'pending'" },
        { name: 'approval_note', def: 'text NULL' },
        { name: 'approved_by', def: 'varchar(255) NULL' },
        { name: 'approved_at', def: 'timestamp NULL' },
        // 志工狀態
        { name: 'volunteer_profile_completed', def: 'boolean DEFAULT false' },
        // FCM
        { name: 'fcm_tokens', def: "text[] DEFAULT '{}'" },
    ];

    for (const col of accountColumns) {
        try {
            const check = await ds.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = $1`,
                [col.name]
            );

            if (check.length === 0) {
                await ds.query(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.def}`);
                console.log(`✓ Added: ${col.name}`);
            } else {
                console.log(`  Exists: ${col.name}`);
            }
        } catch (err) {
            console.log(`✗ Error (${col.name}): ${err.message}`);
        }
    }

    // roles 表列
    const roleColumns = [
        { name: 'display_name', def: 'varchar(255) NULL' },
        { name: 'level', def: 'integer DEFAULT 0' },
    ];

    for (const col of roleColumns) {
        try {
            const check = await ds.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = 'roles' AND column_name = $1`,
                [col.name]
            );

            if (check.length === 0) {
                await ds.query(`ALTER TABLE roles ADD COLUMN ${col.name} ${col.def}`);
                console.log(`✓ Added roles.${col.name}`);
            } else {
                console.log(`  Exists: roles.${col.name}`);
            }
        } catch (err) {
            console.log(`✗ Error roles.${col.name}: ${err.message}`);
        }
    }

    // 更新 owner 角色
    await ds.query(`UPDATE roles SET level = 5, display_name = '系統擁有者' WHERE name = 'owner'`);
    console.log('✓ Updated owner role to level 5');

    await ds.destroy();
    console.log('\n✅ All schema fixes complete!');
}

fixAllColumns().catch(console.error);
