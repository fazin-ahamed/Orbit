"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbManager = exports.supabase = exports.DatabaseManager = exports.DatabaseMode = void 0;
exports.createSupabaseClient = createSupabaseClient;
exports.getDatabaseMode = getDatabaseMode;
const supabase_js_1 = require("@supabase/supabase-js");
// Database connection modes
var DatabaseMode;
(function (DatabaseMode) {
    DatabaseMode["POSTGRESQL"] = "postgresql";
    DatabaseMode["SUPABASE_CLOUD"] = "supabase_cloud";
    DatabaseMode["SUPABASE_SELF_HOSTED"] = "supabase_self_hosted";
})(DatabaseMode || (exports.DatabaseMode = DatabaseMode = {}));
// Get Supabase configuration from environment
function getSupabaseConfig() {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    const databaseUrl = process.env.SUPABASE_DATABASE_URL;
    if (!useSupabase || !url || !anonKey) {
        return null;
    }
    return {
        url,
        anonKey,
        dbPassword,
        databaseUrl
    };
}
// Create Supabase client for application use
function createSupabaseClient() {
    const config = getSupabaseConfig();
    if (!config) {
        return null;
    }
    return (0, supabase_js_1.createClient)(config.url, config.anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    });
}
// Get current database mode
function getDatabaseMode() {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const databaseUrl = process.env.DATABASE_URL;
    const supabaseConfig = getSupabaseConfig();
    if (databaseUrl) {
        if (databaseUrl.includes('supabase.co')) {
            return DatabaseMode.SUPABASE_CLOUD;
        }
        return DatabaseMode.POSTGRESQL;
    }
    if (useSupabase && supabaseConfig) {
        return DatabaseMode.SUPABASE_SELF_HOSTED;
    }
    return DatabaseMode.POSTGRESQL;
}
// Database connection utilities
class DatabaseManager {
    static supabaseClient = null;
    static getSupabaseClient() {
        if (!this.supabaseClient) {
            this.supabaseClient = createSupabaseClient();
        }
        return this.supabaseClient;
    }
    static getCurrentMode() {
        return getDatabaseMode();
    }
    static isSupabaseMode() {
        const mode = this.getCurrentMode();
        return mode === DatabaseMode.SUPABASE_CLOUD || mode === DatabaseMode.SUPABASE_SELF_HOSTED;
    }
    static isSupabaseCloud() {
        return this.getCurrentMode() === DatabaseMode.SUPABASE_CLOUD;
    }
    static isSupabaseSelfHosted() {
        return this.getCurrentMode() === DatabaseMode.SUPABASE_SELF_HOSTED;
    }
    static isPostgreSQLMode() {
        return this.getCurrentMode() === DatabaseMode.POSTGRESQL;
    }
    // Get connection info for logging/debugging
    static getConnectionInfo() {
        return {
            mode: this.getCurrentMode(),
            isSupabase: this.isSupabaseMode(),
            config: {
                useSupabase: process.env.USE_SUPABASE,
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                hasSupabaseConfig: !!getSupabaseConfig(),
            }
        };
    }
    // Health check for database connection
    static async healthCheck() {
        const startTime = Date.now();
        try {
            if (this.isSupabaseMode()) {
                const client = this.getSupabaseClient();
                if (!client) {
                    throw new Error('Supabase client not available');
                }
                // Test connection with a simple query
                const { error } = await client.from('platform.tenants').select('count').limit(1);
                if (error) {
                    throw error;
                }
            }
            else {
                // Test Knex connection
                const { db } = await Promise.resolve().then(() => __importStar(require('./db')));
                await db.raw('SELECT 1');
            }
            return {
                status: 'healthy',
                mode: this.getCurrentMode(),
                responseTime: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                mode: this.getCurrentMode(),
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.DatabaseManager = DatabaseManager;
// Export singleton instance for convenience
exports.supabase = DatabaseManager.getSupabaseClient();
exports.dbManager = DatabaseManager;
//# sourceMappingURL=supabase.js.map