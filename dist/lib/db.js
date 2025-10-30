"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const knex_1 = __importDefault(require("knex"));
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
exports.db = (0, knex_1.default)(config);
//# sourceMappingURL=db.js.map