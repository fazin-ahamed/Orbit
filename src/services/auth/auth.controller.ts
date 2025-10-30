import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../lib/db';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as SAMLStrategy } from 'passport-saml';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const mfaSetupSchema = z.object({
  password: z.string().min(8),
});

const mfaVerifySchema = z.object({
  token: z.string().min(6).max(6),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password, mfaCode } = loginSchema.parse(req.body);
      const tenantId = req.tenantId;

      const user = await db('users')
        .where({ email, tenant_id: tenantId })
        .select('*')
        .first();

      if (!user || !user.password_hash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user has MFA enabled
      if (user.mfa_enabled && user.mfa_secret) {
        if (!mfaCode) {
          return res.status(401).json({
            error: 'MFA_REQUIRED',
            message: 'MFA code required'
          });
        }

        // Verify MFA token
        const verified = speakeasy.totp.verify({
          secret: user.mfa_secret,
          encoding: 'base32',
          token: mfaCode,
          window: 2
        });

        if (!verified) {
          return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, email: user.email, tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, tenantId },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      await db('users')
        .where({ id: user.id })
        .update({ updated_at: db.fn.now() });

      // Log successful login
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: 'login',
        resource: 'auth',
        details: { method: 'password', mfa_used: user.mfa_enabled },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          mfa_enabled: user.mfa_enabled
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password, tenantId, firstName, lastName } = registerSchema.parse(req.body);

      const existingUser = await db('users')
        .where({ email, tenant_id: tenantId })
        .first();

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const [userId] = await db('users')
        .insert({
          tenant_id: tenantId,
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          role: 'user',
          permissions: JSON.stringify(['read:own']),
        })
        .returning('id');

      // Generate tokens
      const token = jwt.sign(
        { userId, email, tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId, tenantId },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Log user registration
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'register',
        resource: 'user',
        resource_id: userId,
        details: { method: 'password' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.status(201).json({
        token,
        refreshToken,
        user: {
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async validate(req: Request, res: Response) {
    // Called by gateway for token validation
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await db('users')
        .where({ id: decoded.userId, tenant_id: decoded.tenantId })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'permissions')
        .first();

      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({ valid: true, user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

      const user = await db('users')
        .where({ id: decoded.userId, tenant_id: decoded.tenantId })
        .select('id', 'email', 'first_name', 'last_name')
        .first();

      if (!user) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Generate new access token
      const token = jwt.sign(
        { userId: user.id, email: user.email, tenantId: decoded.tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { userId: user.id, tenantId: decoded.tenantId },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token, refreshToken: newRefreshToken });
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  static async setupMFA(req: Request, res: Response) {
    try {
      const { password } = mfaSetupSchema.parse(req.body);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Verify password
      const user = await db('users')
        .where({ id: userId })
        .select('password_hash')
        .first();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `BusinessOS:${(req.user as any)?.email}`,
        issuer: 'BusinessOS'
      });

      // Save secret temporarily (in production, use Redis or proper temp storage)
      (req as any).session = (req as any).session || {};
      (req as any).session.mfaSetup = {
        secret: secret.base32,
        userId: userId
      };

      res.json({
        qrCode: secret.otpauth_url,
        secret: secret.base32,
        message: 'Scan QR code with authenticator app'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyMFA(req: Request, res: Response) {
    try {
      const { token } = mfaVerifySchema.parse(req.body);

      if (!(req as any).session?.mfaSetup) {
        return res.status(400).json({ error: 'MFA setup not initiated' });
      }

      const { secret, userId } = (req as any).session.mfaSetup;

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 30 seconds window
      });

      if (!verified) {
        return res.status(400).json({ error: 'Invalid MFA token' });
      }

      // Enable MFA for user
      await db('users')
        .where({ id: userId })
        .update({
          mfa_enabled: true,
          mfa_secret: secret,
          updated_at: db.fn.now()
        });

      // Clear session
      delete (req as any).session.mfaSetup;

      res.json({ message: 'MFA enabled successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async disableMFA(req: Request, res: Response) {
    try {
      const { password } = mfaSetupSchema.parse(req.body);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Verify password
      const user = await db('users')
        .where({ id: userId })
        .select('password_hash')
        .first();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Disable MFA
      await db('users')
        .where({ id: userId })
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          updated_at: db.fn.now()
        });

      res.json({ message: 'MFA disabled successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (token && userId) {
        // In production, maintain a blacklist of tokens
        // For now, just return success
        await db('audit_logs').insert({
          tenant_id: req.tenantId,
          user_id: userId,
          action: 'logout',
          resource: 'auth',
          details: { token_expired: true },
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          outcome: 'success'
        });
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const user = await db('users')
        .where({ id: userId })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'mfa_enabled', 'created_at', 'updated_at')
        .first();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { firstName, lastName, email } = req.body;

      await db('users')
        .where({ id: userId })
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          updated_at: db.fn.now()
        });

      // Log the profile update
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        user_id: userId,
        action: 'profile_update',
        resource: 'user',
        resource_id: userId,
        details: { updated_fields: ['first_name', 'last_name', 'email'] },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}