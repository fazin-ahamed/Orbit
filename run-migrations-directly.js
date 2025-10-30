require('dotenv').config();

const knex = require('knex');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running migrations directly...');

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
});

async function runMigrationsDirectly() {
  try {
    console.log('🔄 Creating platform schema...');

    // Create platform schema if it doesn't exist
    await db.raw('CREATE SCHEMA IF NOT EXISTS platform');

    console.log('📋 Migration files found:');
    const migrationFiles = fs.readdirSync('./src/migrations')
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    migrationFiles.forEach(file => {
      console.log(`  📄 ${file}`);
    });

    // Import and run each migration manually
    for (const file of migrationFiles) {
      console.log(`\n🔄 Running migration: ${file}`);

      // For TypeScript files, we'll need to handle them differently
      if (file.endsWith('.ts')) {
        console.log(`⏭️ Skipping TypeScript migration: ${file}`);
        console.log(`💡 Run 'npm run build' first to compile TypeScript migrations`);
        continue;
      }

      try {
        const migration = require(path.join('../src/migrations', file));

        if (migration.up && typeof migration.up === 'function') {
          console.log(`⚡ Executing migration: ${file}`);
          await migration.up(db);
          console.log(`✅ Migration completed: ${file}`);
        } else {
          console.log(`⚠️ No 'up' function found in: ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error in migration ${file}:`, error.message);
      }
    }

    console.log('\n🎉 All migrations completed successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'platform'
      ORDER BY table_name;
    `);

    if (tables.rows.length > 0) {
      console.log('✅ Tables created:');
      tables.rows.forEach(table => {
        console.log(`  📋 ${table.table_name}`);
      });
    } else {
      console.log('❌ No tables found in platform schema');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

// Check if migration files are compiled
async function checkMigrationFiles() {
  const migrationDir = './src/migrations';

  if (!fs.existsSync(migrationDir)) {
    console.error(`❌ Migration directory not found: ${migrationDir}`);
    return false;
  }

  const files = fs.readdirSync(migrationDir);
  const tsFiles = files.filter(f => f.endsWith('.ts'));
  const jsFiles = files.filter(f => f.endsWith('.js'));

  console.log(`📁 Found ${files.length} files in migrations directory`);
  console.log(`📄 TypeScript files: ${tsFiles.length}`);
  console.log(`📄 JavaScript files: ${jsFiles.length}`);

  if (tsFiles.length > 0 && jsFiles.length === 0) {
    console.log('⚠️ TypeScript migrations found but no compiled JavaScript versions');
    console.log('💡 You may need to compile TypeScript first or run migrations differently');
    return false;
  }

  return true;
}

async function main() {
  const hasValidMigrations = await checkMigrationFiles();

  if (hasValidMigrations) {
    await runMigrationsDirectly();
  } else {
    console.log('\n🔧 Alternative: Try running knex migrations with explicit knexfile');
    console.log('npx knex migrate:latest --knexfile knexfile.js');
  }
}

main();