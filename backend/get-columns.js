const { DataSource } = require('typeorm');

async function getColumns() {
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
    const cols = await ds.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' ORDER BY ordinal_position"
    );
    console.log('Accounts columns:');
    cols.forEach(c => console.log('  -', c.column_name));
    await ds.destroy();
}

getColumns().catch(console.error);
