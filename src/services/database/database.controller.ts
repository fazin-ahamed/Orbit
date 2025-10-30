import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { DatabaseManager } from '../../lib/supabase';

export class DatabaseController {
  static async healthCheck(req: Request, res: Response) {
    try {
      const connectionInfo = DatabaseManager.getConnectionInfo();
      const health = await DatabaseManager.healthCheck();

      res.json({
        ...health,
        connectionInfo,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const connectionInfo = DatabaseManager.getConnectionInfo();

      // Get table counts
      const tenantCount = await db('platform.tenants').count('* as count').first();
      const userCount = await db('platform.users').count('* as count').first();

      // Get database version
      const version = await db.raw('SELECT version() as version');

      res.json({
        mode: connectionInfo.mode,
        isSupabase: connectionInfo.isSupabase,
        stats: {
          tenants: parseInt(tenantCount?.count as string || '0'),
          users: parseInt(userCount?.count as string || '0'),
        },
        database: {
          version: version.rows[0].version,
          provider: connectionInfo.isSupabase ? 'Supabase' : 'PostgreSQL'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async testConnection(req: Request, res: Response) {
    try {
      const startTime = Date.now();

      // Test basic query
      await db.raw('SELECT 1 as test');

      const responseTime = Date.now() - startTime;

      res.json({
        status: 'success',
        message: 'Database connection successful',
        responseTime: `${responseTime}ms`,
        mode: DatabaseManager.getCurrentMode(),
        isSupabase: DatabaseManager.isSupabaseMode(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: DatabaseManager.getCurrentMode(),
        timestamp: new Date().toISOString()
      });
    }
  }
}