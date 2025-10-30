"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const knex_1 = __importDefault(require("knex"));
const config = require('../../knexfile.js');
exports.db = (0, knex_1.default)(config[process.env.NODE_ENV || 'development']);
//# sourceMappingURL=db.js.map