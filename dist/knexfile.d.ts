import type { Knex } from 'knex';
declare const config: {
    [key: string]: Knex.Config;
};
export default config;
export declare function getDatabaseConfig(env?: string): Knex.Config;
//# sourceMappingURL=knexfile.d.ts.map