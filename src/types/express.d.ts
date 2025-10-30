import 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: {
        id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        permissions?: string[];
      };
      session?: {
        mfaSetup?: {
          secret: string;
          userId: string;
        };
      };
    }
  }
}

// User type for authentication
export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  permissions?: string[];
  tenant_id: string;
  mfa_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}