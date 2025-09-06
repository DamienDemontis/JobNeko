import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/jobs/[id]/route';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

// Mock the dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  validateToken: jest.fn(),
}));

const mockPrisma = prisma as any;
const mockValidateToken = validateToken as jest.MockedFunction<typeof validateToken>;

describe('/api/jobs/[id] DELETE', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockJobId = 'job123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a job successfully', async () => {
    // Setup mocks
    mockValidateToken.mockResolvedValue(mockUser);
    mockPrisma.job.deleteMany.mockResolvedValue({ count: 1 });

    // Create request
    const request = new NextRequest('http://localhost:3000/api/jobs/job123', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data).toEqual({ message: 'Job deleted successfully' });
    expect(mockValidateToken).toHaveBeenCalledWith('valid-token');
    expect(mockPrisma.job.deleteMany).toHaveBeenCalledWith({
      where: {
        id: mockJobId,
        userId: mockUser.id,
      },
    });
  });

  it('should delete job with cookie authentication', async () => {
    // Setup mocks
    mockValidateToken.mockResolvedValue(mockUser);
    mockPrisma.job.deleteMany.mockResolvedValue({ count: 1 });

    // Create request with cookie instead of header
    const request = new NextRequest('http://localhost:3000/api/jobs/job123', {
      method: 'DELETE',
      headers: {
        'Cookie': 'token=cookie-token',
      },
    });

    // Mock the cookies.get method
    Object.defineProperty(request, 'cookies', {
      value: {
        get: jest.fn().mockReturnValue({ value: 'cookie-token' }),
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data).toEqual({ message: 'Job deleted successfully' });
    expect(mockValidateToken).toHaveBeenCalledWith('cookie-token');
  });

  it('should return 401 when no token provided', async () => {
    // Create request without token
    const request = new NextRequest('http://localhost:3000/api/jobs/job123', {
      method: 'DELETE',
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(mockValidateToken).not.toHaveBeenCalled();
    expect(mockPrisma.job.deleteMany).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', async () => {
    // Setup mocks
    mockValidateToken.mockResolvedValue(null);

    // Create request
    const request = new NextRequest('http://localhost:3000/api/jobs/job123', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Invalid token' });
    expect(mockValidateToken).toHaveBeenCalledWith('invalid-token');
    expect(mockPrisma.job.deleteMany).not.toHaveBeenCalled();
  });

  it('should return 404 when job not found', async () => {
    // Setup mocks
    mockValidateToken.mockResolvedValue(mockUser);
    mockPrisma.job.deleteMany.mockResolvedValue({ count: 0 }); // No job deleted

    // Create request
    const request = new NextRequest('http://localhost:3000/api/jobs/nonexistent', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Job not found' });
    expect(mockValidateToken).toHaveBeenCalledWith('valid-token');
    expect(mockPrisma.job.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'nonexistent',
        userId: mockUser.id,
      },
    });
  });

  it('should return 404 when trying to delete another users job', async () => {
    // Setup mocks
    mockValidateToken.mockResolvedValue(mockUser);
    mockPrisma.job.deleteMany.mockResolvedValue({ count: 0 }); // No job deleted (wrong user)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/jobs/other-users-job', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: 'other-users-job' }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Job not found' });
    expect(mockPrisma.job.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'other-users-job',
        userId: mockUser.id, // Should only delete jobs belonging to this user
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    // Setup mocks
    mockValidateToken.mockResolvedValue(mockUser);
    mockPrisma.job.deleteMany.mockRejectedValue(new Error('Database connection failed'));

    // Create request
    const request = new NextRequest('http://localhost:3000/api/jobs/job123', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to delete job' });
    expect(mockValidateToken).toHaveBeenCalledWith('valid-token');
    expect(mockPrisma.job.deleteMany).toHaveBeenCalledWith({
      where: {
        id: mockJobId,
        userId: mockUser.id,
      },
    });
  });

  it('should handle authentication errors gracefully', async () => {
    // Setup mocks
    mockValidateToken.mockRejectedValue(new Error('Token validation failed'));

    // Create request
    const request = new NextRequest('http://localhost:3000/api/jobs/job123', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer problematic-token',
      },
    });

    // Call the API
    const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to delete job' });
    expect(mockValidateToken).toHaveBeenCalledWith('problematic-token');
    expect(mockPrisma.job.deleteMany).not.toHaveBeenCalled();
  });
});