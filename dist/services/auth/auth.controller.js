"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../../lib/db");
const zod_1 = require("zod");
const speakeasy_1 = __importDefault(require("speakeasy"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    mfaCode: zod_1.z.string().optional(),
});
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    tenantId: zod_1.z.string(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
});
const mfaSetupSchema = zod_1.z.object({
    password: zod_1.z.string().min(8),
});
const mfaVerifySchema = zod_1.z.object({
    token: zod_1.z.string().min(6).max(6),
});
class AuthController {
    static async login(req, res) {
        try {
            const { email, password, mfaCode } = loginSchema.parse(req.body);
            const tenantId = req.tenantId;
            const user = await (0, db_1.db)('users')
                .where({ email, tenant_id: tenantId })
                .select('*')
                .first();
            if (!user || !user.password_hash) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const valid = await bcrypt_1.default.compare(password, user.password_hash);
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
                const verified = speakeasy_1.default.totp.verify({
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
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, tenantId }, JWT_SECRET, { expiresIn: '1h' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, tenantId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            // Update last login
            await (0, db_1.db)('users')
                .where({ id: user.id })
                .update({ updated_at: db_1.db.fn.now() });
            // Log successful login
            await (0, db_1.db)('audit_logs').insert({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async register(req, res) {
        try {
            const { email, password, tenantId, firstName, lastName } = registerSchema.parse(req.body);
            const existingUser = await (0, db_1.db)('users')
                .where({ email, tenant_id: tenantId })
                .first();
            if (existingUser) {
                return res.status(409).json({ error: 'User already exists' });
            }
            const hashedPassword = await bcrypt_1.default.hash(password, 12);
            const [userId] = await (0, db_1.db)('users')
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
            const token = jsonwebtoken_1.default.sign({ userId, email, tenantId }, JWT_SECRET, { expiresIn: '1h' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId, tenantId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            // Log user registration
            await (0, db_1.db)('audit_logs').insert({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async validate(req, res) {
        // Called by gateway for token validation
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = await (0, db_1.db)('users')
                .where({ id: decoded.userId, tenant_id: decoded.tenantId })
                .select('id', 'email', 'first_name', 'last_name', 'role', 'permissions')
                .first();
            if (!user) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            res.json({ valid: true, user });
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token required' });
            }
            const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
            const user = await (0, db_1.db)('users')
                .where({ id: decoded.userId, tenant_id: decoded.tenantId })
                .select('id', 'email', 'first_name', 'last_name')
                .first();
            if (!user) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            // Generate new access token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, tenantId: decoded.tenantId }, JWT_SECRET, { expiresIn: '1h' });
            // Generate new refresh token
            const newRefreshToken = jsonwebtoken_1.default.sign({ userId: user.id, tenantId: decoded.tenantId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            res.json({ token, refreshToken: newRefreshToken });
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid refresh token' });
        }
    }
    static async setupMFA(req, res) {
        try {
            const { password } = mfaSetupSchema.parse(req.body);
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Verify password
            const user = await (0, db_1.db)('users')
                .where({ id: userId })
                .select('password_hash')
                .first();
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const validPassword = await bcrypt_1.default.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid password' });
            }
            // Generate MFA secret
            const secret = speakeasy_1.default.generateSecret({
                name: `BusinessOS:${req.user?.email}`,
                issuer: 'BusinessOS'
            });
            // Save secret temporarily (in production, use Redis or proper temp storage)
            req.session = req.session || {};
            req.session.mfaSetup = {
                secret: secret.base32,
                userId: userId
            };
            res.json({
                qrCode: secret.otpauth_url,
                secret: secret.base32,
                message: 'Scan QR code with authenticator app'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async verifyMFA(req, res) {
        try {
            const { token } = mfaVerifySchema.parse(req.body);
            if (!req.session?.mfaSetup) {
                return res.status(400).json({ error: 'MFA setup not initiated' });
            }
            const { secret, userId } = req.session.mfaSetup;
            // Verify token
            const verified = speakeasy_1.default.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 2 // Allow 30 seconds window
            });
            if (!verified) {
                return res.status(400).json({ error: 'Invalid MFA token' });
            }
            // Enable MFA for user
            await (0, db_1.db)('users')
                .where({ id: userId })
                .update({
                mfa_enabled: true,
                mfa_secret: secret,
                updated_at: db_1.db.fn.now()
            });
            // Clear session
            delete req.session.mfaSetup;
            res.json({ message: 'MFA enabled successfully' });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async disableMFA(req, res) {
        try {
            const { password } = mfaSetupSchema.parse(req.body);
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Verify password
            const user = await (0, db_1.db)('users')
                .where({ id: userId })
                .select('password_hash')
                .first();
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const validPassword = await bcrypt_1.default.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid password' });
            }
            // Disable MFA
            await (0, db_1.db)('users')
                .where({ id: userId })
                .update({
                mfa_enabled: false,
                mfa_secret: null,
                updated_at: db_1.db.fn.now()
            });
            res.json({ message: 'MFA disabled successfully' });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async logout(req, res) {
        try {
            const userId = req.user?.id;
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token && userId) {
                // In production, maintain a blacklist of tokens
                // For now, just return success
                await (0, db_1.db)('audit_logs').insert({
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
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const user = await (0, db_1.db)('users')
                .where({ id: userId })
                .select('id', 'email', 'first_name', 'last_name', 'role', 'mfa_enabled', 'created_at', 'updated_at')
                .first();
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ user });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { firstName, lastName, email } = req.body;
            await (0, db_1.db)('users')
                .where({ id: userId })
                .update({
                first_name: firstName,
                last_name: lastName,
                email: email,
                updated_at: db_1.db.fn.now()
            });
            // Log the profile update
            await (0, db_1.db)('audit_logs').insert({
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
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map