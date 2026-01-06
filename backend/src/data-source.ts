import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });
config();

const isUnixSocket = process.env.DB_HOST?.startsWith('/');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: isUnixSocket ? undefined : (process.env.DB_HOST || 'localhost'),
    port: isUnixSocket ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'lightkeepers',
    // For Cloud SQL Unix socket
    extra: isUnixSocket ? { socketPath: process.env.DB_HOST } : undefined,
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
    // Include all entities via glob pattern
    entities: [join(__dirname, 'modules/**/*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations/*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
});

export default AppDataSource;
