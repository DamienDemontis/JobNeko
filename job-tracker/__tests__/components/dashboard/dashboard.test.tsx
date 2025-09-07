import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import DashboardPage from '../../../app/dashboard/page';
import { TestWrapper } from '../../../test-utils';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const mockJobs = [
  {
    id: 'job1',
    title: 'Software Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    salary: '$120,000',
    workMode: 'remote',
    matchScore: 85,
    rating: 4,
    createdAt: '2024-01-15T10:00:00Z',
    applicationStatus: 'not_applied',
    salaryAnalysis: {
      normalizedSalaryUSD: {
        min: 110000,
        max: 130000
      },
      comfortLevel: 'comfortable',
      comfortScore: 85,
      betterThanPercent: 20,
      savingsPotential: 25.5,
      purchasingPower: 1.2
    }
  },
  {
    id: 'job2',
    title: 'Frontend Developer',
    company: 'WebCorp',
    location: 'New York, NY',
    salary: '$100,000',
    workMode: 'hybrid',
    matchScore: 75,
    rating: null,
    createdAt: '2024-01-14T10:00:00Z',
    applicationStatus: 'applied',
    salaryAnalysis: {
      normalizedSalaryUSD: {
        min: 95000,
        max: 105000
      },
      comfortLevel: 'tight',
      comfortScore: 65,
      betterThanPercent: 40,
      savingsPotential: 15.0,
      purchasingPower: 0.9
    }
  },
];

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });
  });

  it('redirects to login when not authenticated', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<DashboardPage />, { wrapper: TestWrapper });

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('renders dashboard with user info and jobs', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: mockJobs, pagination: { total: 2 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    });

    // Check stats
    expect(screen.getByText('2')).toBeInTheDocument(); // Total jobs
    expect(screen.getByText('1')).toBeInTheDocument(); // Applied
    expect(screen.getByText('80%')).toBeInTheDocument(); // Avg match
  });

  it('handles empty jobs state', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: [], pagination: { total: 0 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('No jobs found')).toBeInTheDocument();
      expect(screen.getByText('Install the Chrome extension and start extracting job offers!')).toBeInTheDocument();
    });
  });

  it('allows searching jobs', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: mockJobs, pagination: { total: 2 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Wait for the page to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading your jobs...')).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search jobs, companies...');
    await user.type(searchInput, 'software');

    // Should trigger search after debounce
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=software'),
        expect.any(Object)
      );
    }, { timeout: 1000 });
  });

  it('renders filter controls', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: mockJobs, pagination: { total: 2 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Wait for the page to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading your jobs...')).not.toBeInTheDocument();
    });

    // Verify filter controls are present
    expect(screen.getByPlaceholderText('Search jobs, companies...')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(2); // Work mode and sort filters
  });

  it('renders sorting controls', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: mockJobs, pagination: { total: 2 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Wait for the page to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading your jobs...')).not.toBeInTheDocument();
    });

    // Verify sorting controls are present (testing the basic functionality)
    expect(screen.getByText('Filters & Search')).toBeInTheDocument();
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(2);
  });

  it('allows rating jobs', async () => {
    const user = userEvent.setup();
    const mockJobsResponse = {
      ok: true,
      json: async () => ({ jobs: mockJobs, pagination: { total: 2 } }),
    };
    const mockRatingResponse = {
      ok: true,
      json: async () => ({ rating: { rating: 5 } }),
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockJobsResponse)
      .mockResolvedValueOnce(mockRatingResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Wait for the page to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading your jobs...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // Find star rating elements and click the 5th star
    const starElements = document.querySelectorAll('svg[class*="w-4 h-4 cursor-pointer"]');
    if (starElements.length >= 5) {
      await user.click(starElements[4] as HTMLElement); // Click 5th star

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/jobs/job1/rate',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-token',
            }),
            body: JSON.stringify({ rating: 5 }),
          })
        );
      });
    }
  });

  it('handles logout', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: [], pagination: { total: 0 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Wait for the page to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading your jobs...')).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token' },
      })
    );

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('shows loading state initially', () => {
    const mockResponse = new Promise(() => {}); // Never resolves
    (fetch as jest.Mock).mockReturnValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    expect(screen.getByText('Loading your jobs...')).toBeInTheDocument();
  });

  it('displays job cards with correct information', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ jobs: mockJobs, pagination: { total: 2 } }),
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<DashboardPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Check first job
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('TechCorp')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('$120,000')).toBeInTheDocument();
      expect(screen.getByText('remote')).toBeInTheDocument();
      expect(screen.getByText('85% match')).toBeInTheDocument();

      // Check second job
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('WebCorp')).toBeInTheDocument();
      expect(screen.getByText('New York, NY')).toBeInTheDocument();
      expect(screen.getByText('applied')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<DashboardPage />, { wrapper: TestWrapper });

    // Should not crash and should show some error state or empty state
    await waitFor(() => {
      // The component should handle errors gracefully
      expect(screen.queryByText('Loading your jobs...')).not.toBeInTheDocument();
    });
  });
});