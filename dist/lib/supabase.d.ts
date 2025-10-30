import { SupabaseClient } from '@supabase/supabase-js';
export declare enum DatabaseMode {
    POSTGRESQL = "postgresql",
    SUPABASE_CLOUD = "supabase_cloud",
    SUPABASE_SELF_HOSTED = "supabase_self_hosted"
}
export declare function createSupabaseClient(): SupabaseClient | null;
export declare function getDatabaseMode(): DatabaseMode;
export declare class DatabaseManager {
    private static supabaseClient;
    static getSupabaseClient(): SupabaseClient | null;
    static getCurrentMode(): DatabaseMode;
    static isSupabaseMode(): boolean;
    static isSupabaseCloud(): boolean;
    static isSupabaseSelfHosted(): boolean;
    static isPostgreSQLMode(): boolean;
    static getConnectionInfo(): {
        mode: DatabaseMode;
        isSupabase: boolean;
        config: any;
    };
    static healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        mode: DatabaseMode;
        responseTime: number;
        error?: string;
    }>;
}
export declare const supabase: SupabaseClient<any, "public", "public", any, any> | null;
export declare const dbManager: typeof DatabaseManager;
//# sourceMappingURL=supabase.d.ts.map