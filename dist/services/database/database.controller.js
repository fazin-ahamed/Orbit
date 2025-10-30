"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseController = void 0;
const db_1 = require("../../lib/db");
const supabase_1 = require("../../lib/supabase");
class DatabaseController {
    static async healthCheck(req, res) {
        try {
            const connectionInfo = supabase_1.DatabaseManager.getConnectionInfo();
            const health = await supabase_1.DatabaseManager.healthCheck();
            res.json({
                ...health,
                connectionInfo,
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        }
        catch (error) {
            res.status(500).json({
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    static async getStats(req, res) {
        try {
            const connectionInfo = supabase_1.DatabaseManager.getConnectionInfo();
            // Get table counts
            const tenantCount = await (0, db_1.db)('platform.tenants').count('* as count').first();
            const userCount = await (0, db_1.db)('platform.users').count('* as count').first();
            // Get database version
            const version = await db_1.db.raw('SELECT version() as version');
            res.json({
                mode: connectionInfo.mode,
                isSupabase: connectionInfo.isSupabase,
                stats: {
                    tenants: parseInt(tenantCount?.count || '0'),
                    users: parseInt(userCount?.count || '0'),
                },
                database: {
                    version: version.rows[0].version,
                    provider: connectionInfo.isSupabase ? 'Supabase' : 'PostgreSQL'
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    static async testConnection(req, res) {
        try {
            const startTime = Date.now();
            // Test basic query
            await db_1.db.raw('SELECT 1 as test');
            const responseTime = Date.now() - startTime;
            res.json({
                status: 'success',
                message: 'Database connection successful',
                responseTime: `${responseTime}ms`,
                mode: supabase_1.DatabaseManager.getCurrentMode(),
                isSupabase: supabase_1.DatabaseManager.isSupabaseMode(),
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Database connection failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                mode: supabase_1.DatabaseManager.getCurrentMode(),
                timestamp: new Date().toISOString()
            });
        }
    }
}
exports.DatabaseController = DatabaseController;
//# sourceMappingURL=database.controller.js.map