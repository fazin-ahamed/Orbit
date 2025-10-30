"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseConfig = getDatabaseConfig;
// Database connection factory function
function createConnectionConfig() {
    // Check if using Supabase (either cloud or self-hosted)
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD;
    // Supabase connection configuration
    if (useSupabase && supabaseUrl && supabaseKey) {
        return {
            host: supabaseUrl.replace('https://', '').replace('http://', '').split('.')[0] + '.supabase.co',
            port: 5432,
            user: 'postgres',
            password: supabaseDbPassword || supabaseKey,
            database: 'postgres',
            ssl: { rejectUnauthorized: false }
        };
    }
    // Traditional PostgreSQL connection
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'businessos_dev',
    };
}
const config = {
    development: {
        client: 'pg',
        connection: createConnectionConfig(),
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
        pool: {
            min: 2,
            max: 10,
        },
    },
    production: {
        client: 'pg',
        connection: process.env.DATABASE_URL ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.USE_SUPABASE === 'true' ? { rejectUnauthorized: false } : { rejectUnauthorized: true }
        } : createConnectionConfig(),
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        pool: {
            min: 2,
            max: 20,
        },
    },
    // Supabase-specific configuration
    supabase: {
        client: 'pg',
        connection: {
            connectionString: process.env.SUPABASE_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        pool: {
            min: 2,
            max: 10,
        },
    },
    // Local PostgreSQL configuration (for development without Supabase)
    local: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'businessos_dev',
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },
};
exports.default = config;
// Helper function to get the appropriate configuration based on environment
function getDatabaseConfig(env) {
    const environment = env || process.env.NODE_ENV || 'development';
    // If DATABASE_URL is provided, use it directly (works for both PostgreSQL and Supabase)
    if (process.env.DATABASE_URL) {
        return {
            client: 'pg',
            connection: process.env.DATABASE_URL,
            migrations: {
                directory: './migrations',
                tableName: 'knex_migrations',
            },
            pool: {
                min: 2,
                max: environment === 'production' ? 20 : 10,
            },
        };
    }
    return config[environment] || config.development;
}
//# sourceMappingURL=knexfile.js.map