import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../src/services/auth/auth.controller';
import { db } from '../src/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Mock db
vi.mock('../src/lib/db', () => ({
  db: vi.fn(),
}));

const mockDb = vi.mocked(db);

describe('AuthController', () => {
  const mockReq = {
    body: {},
    tenantId: 'test-tenant',
    headers: {},
  };
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    });
  });

  it('should login successfully', async () => {
    mockReq.body = { email: 'test@example.com', password: 'password123' };
    const hashedPassword = await bcrypt.hash('password123', 12);
    const mockUser = { id: 'user1', email: 'test@example.com', hashed_password: hashedPassword, tenant_id: 'test-tenant' };

    mockDb().where().first.mockResolvedValue(mockUser);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    await AuthController.login(mockReq as any, mockRes as any);

    expect(mockDb().where()).toHaveBeenCalledWith({ email: 'test@example.com', tenant_id: 'test-tenant' });
    expect(mockRes.status).not.toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it('should return 401 for invalid credentials', async () => {
    mockReq.body = { email: 'test@example.com', password: 'wrong' };
    mockDb().where().first.mockResolvedValue({ id: 'user1', hashed_password: 'hash' });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await AuthController.login(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('should register new user', async () => {
    mockReq.body = { email: 'new@example.com', password: 'password123', tenantId: 'test-tenant' };
    mockDb().where().first.mockResolvedValue(null);
    mockDb().insert().returning.mockResolvedValue([{ id: 'new-user', email: 'new@example.com' }]);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as any);

    await AuthController.register(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it('should return 409 for existing user', async () => {
    mockReq.body = { email: 'existing@example.com', password: 'password123', tenantId: 'test-tenant' };
    mockDb().where().first.mockResolvedValue({ id: 'existing' });

    await AuthController.register(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it('should validate token', async () => {
    const token = jwt.sign({ userId: 'user1', tenantId: 'test-tenant' }, 'secret');
    mockReq.headers.authorization = `Bearer ${token}`;
    mockDb().where().first.mockResolvedValue({ id: 'user1', email: 'test@example.com' });

    await AuthController.validate(mockReq as any, mockRes as any);

    expect(mockRes.json).toHaveBeenCalledWith({ valid: true, user: expect.any(Object) });
  });
});