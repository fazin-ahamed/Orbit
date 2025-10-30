require('dotenv').config();

const knex = require('knex');

console.log('🔧 Running direct migration...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'businessos_dev',
  },
  migrations: {
    directory: './src/migrations',
    tableName: 'knex_migrations',
  },
  pool: {
    min: 2,
    max: 10,
  },
});

async function runMigrations() {
  try {
    console.log('🔄 Checking migration status...');
    const status = await db.migrate.status();
    console.log('📊 Migration status:', status);

    if (status > 0) {
      console.log('🚀 Running migrations...');
      const result = await db.migrate.latest();
      console.log('✅ Migrations completed:', result);
    } else {
      console.log('✅ No pending migrations');
    }

    console.log('🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

runMigrations();