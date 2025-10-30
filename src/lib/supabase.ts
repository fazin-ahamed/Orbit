import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration interface
interface SupabaseConfig {
  url: string;
  anonKey: string;
  dbPassword?: string;
  databaseUrl?: string;
}

// Database connection modes
export enum DatabaseMode {
  POSTGRESQL = 'postgresql',
  SUPABASE_CLOUD = 'supabase_cloud',
  SUPABASE_SELF_HOSTED = 'supabase_self_hosted'
}

// Get Supabase configuration from environment
function getSupabaseConfig(): SupabaseConfig | null {
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
export function createSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  return createClient(config.url, config.anonKey, {
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
export function getDatabaseMode(): DatabaseMode {
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
export class DatabaseManager {
  private static supabaseClient: SupabaseClient | null = null;

  static getSupabaseClient(): SupabaseClient | null {
    if (!this.supabaseClient) {
      this.supabaseClient = createSupabaseClient();
    }
    return this.supabaseClient;
  }

  static getCurrentMode(): DatabaseMode {
    return getDatabaseMode();
  }

  static isSupabaseMode(): boolean {
    const mode = this.getCurrentMode();
    return mode === DatabaseMode.SUPABASE_CLOUD || mode === DatabaseMode.SUPABASE_SELF_HOSTED;
  }

  static isSupabaseCloud(): boolean {
    return this.getCurrentMode() === DatabaseMode.SUPABASE_CLOUD;
  }

  static isSupabaseSelfHosted(): boolean {
    return this.getCurrentMode() === DatabaseMode.SUPABASE_SELF_HOSTED;
  }

  static isPostgreSQLMode(): boolean {
    return this.getCurrentMode() === DatabaseMode.POSTGRESQL;
  }

  // Get connection info for logging/debugging
  static getConnectionInfo(): {
    mode: DatabaseMode;
    isSupabase: boolean;
    config: any;
  } {
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
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    mode: DatabaseMode;
    responseTime: number;
    error?: string;
  }> {
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
      } else {
        // Test Knex connection
        const { db } = await import('./db');
        await db.raw('SELECT 1');
      }

      return {
        status: 'healthy',
        mode: this.getCurrentMode(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        mode: this.getCurrentMode(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance for convenience
export const supabase = DatabaseManager.getSupabaseClient();
export const dbManager = DatabaseManager;