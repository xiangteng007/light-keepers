const bcrypt = require('bcryptjs');
const { DataSource } = require('typeorm');

async function createOwner() {
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

    // 取得 owner 角色 ID
    const roleResult = await ds.query("SELECT id FROM roles WHERE name = 'owner'");
    if (roleResult.length === 0) {
        console.log('Owner role not found');
        await ds.destroy();
        return;
    }
    const roleId = roleResult[0].id;
    console.log('Owner role ID:', roleId);

    // 建立帳號
    const passwordHash = await bcrypt.hash('19861007', 10);
    const existingAcc = await ds.query("SELECT id FROM accounts WHERE email = 'xiangteng007@gmail.com'");

    let accountId;
    if (existingAcc.length > 0) {
        accountId = existingAcc[0].id;
        await ds.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [passwordHash, accountId]);
        console.log('Password updated for account:', accountId);
    } else {
        const result = await ds.query(
            'INSERT INTO accounts (email, password_hash, display_name, is_active) VALUES ($1, $2, $3, true) RETURNING id',
            ['xiangteng007@gmail.com', passwordHash, '系統擁有者']
        );
        accountId = result[0].id;
        console.log('Created account:', accountId);
    }

    // 綁定角色
    await ds.query(
        "INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [accountId, roleId]
    );
    console.log('Role assigned');

    await ds.destroy();
    console.log('\n✅ Done! Login with xiangteng007@gmail.com / 19861007');
}

createOwner().catch(console.error);
