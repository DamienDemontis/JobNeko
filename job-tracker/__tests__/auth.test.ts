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
      const payload = { id: 'user123', email: 'test@example.com' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid tokens', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });
  });
});