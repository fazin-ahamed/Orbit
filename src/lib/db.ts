import knex from 'knex';

const config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './src/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/seeds',
  },
  pool: {
    min: 2,
    max: 10,
  },
  timezone: 'UTC',
  debug: false,
};

export const db = knex(config);