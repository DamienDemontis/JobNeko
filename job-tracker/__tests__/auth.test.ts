import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth';

describe('Authentication', () => {
  describe('Password hashing', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      
      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPassword('wrongPassword', hashed);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('should generate and verify tokens correctly', () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const token = generateToken(userId, email);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = verifyToken(token);
      expect(decoded?.id).toBe(userId);
      expect(decoded?.email).toBe(email);
    });

    it('should return null for invalid tokens', () => {
      const result = verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });
  });
});