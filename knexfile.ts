import { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 54322, // Supabase local database port
      user: 'postgres',
      password: 'postgres', // Default Supabase local password
      database: 'postgres',
    },
    migrations: {
      directory: './src/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/seeds',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
