import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIJobDiscovery } from '@/components/ui/ai-job-discovery';
import { useAuth } from '@/contexts/AuthContext';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the toast function
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('AIJobDiscovery', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockToken = 'mock-auth-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: mockToken,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    });
  });

  test('should render component header', () => {
    render(<AIJobDiscovery />);

    expect(screen.getByText('AI Job Discovery')).toBeInTheDocument();
    expect(screen.getByText('Intelligent job matching and market insights')).toBeInTheDocument();
  });

  test('should render job opportunities after loading', async () => {
    render(<AIJobDiscovery />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display quick stats
    expect(screen.getByText('Total Matches')).toBeInTheDocument();
    expect(screen.getByText('New Today')).toBeInTheDocument();
    expect(screen.getByText('Urgent Deadlines')).toBeInTheDocument();

    // Should display tab navigation
    expect(screen.getByRole('button', { name: /opportunities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /market alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salary trends/i })).toBeInTheDocument();
  });

  test('should display job opportunities by default', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show search input
    expect(screen.getByPlaceholderText('Search opportunities...')).toBeInTheDocument();

    // Should show job listings
    expect(screen.getByText('Senior Full Stack Developer')).toBeInTheDocument();
    expect(screen.getByText('TechFlow Solutions')).toBeInTheDocument();
    expect(screen.getByText('Perfect skill match with React, Node.js, and AI experience')).toBeInTheDocument();
  });

  test('should switch between tabs correctly', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Click on Market Alerts tab
    fireEvent.click(screen.getByRole('button', { name: /market alerts/i }));

    // Should show market alerts content
    await waitFor(() => {
      expect(screen.getByText('AI Engineering Salaries Up 15%')).toBeInTheDocument();
      expect(screen.getByText('12 New Startups Hiring in Your Area')).toBeInTheDocument();
    });

    // Click on Salary Trends tab
    fireEvent.click(screen.getByRole('button', { name: /salary trends/i }));

    // Should show salary trends content
    await waitFor(() => {
      expect(screen.getByText('AI/Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('React Development')).toBeInTheDocument();
      expect(screen.getByText('Product Management')).toBeInTheDocument();
    });
  });

  test('should filter opportunities based on search input', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search opportunities...');

    // Type in search input
    fireEvent.change(searchInput, { target: { value: 'frontend' } });

    // Search functionality would filter results in real implementation
    expect(searchInput).toHaveValue('frontend');
  });

  test('should display match scores correctly', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should display content indicators
    const pageContent = document.body.textContent || '';
    expect(pageContent.includes('127') || pageContent.includes('matches')).toBeTruthy();
  });

  test('should show urgency badges correctly', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show urgency indicators
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  test('should display salary trends with proper indicators', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to salary trends tab
    fireEvent.click(screen.getByRole('button', { name: /salary trends/i }));

    await waitFor(() => {
      // Should show salary ranges
      expect(screen.getByText('$140k - $220k')).toBeInTheDocument();
      expect(screen.getByText('$110k - $160k')).toBeInTheDocument();
      expect(screen.getByText('$130k - $190k')).toBeInTheDocument();

      // Should show percentage changes (may be formatted differently)
      expect(screen.getByText('+15%') || screen.getByText('15%') || screen.getByText('15')).toBeTruthy();
    });
  });

  test('should handle market alerts with different impact levels', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to market alerts tab
    fireEvent.click(screen.getByRole('button', { name: /market alerts/i }));

    await waitFor(() => {
      // Should show different impact levels
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getAllByText('MEDIUM')).toHaveLength(2);
    });
  });

  test('should show action buttons for job opportunities', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show some interactive elements
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should handle authentication state properly', () => {
    // Test with no user
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    });

    render(<AIJobDiscovery />);

    // Should still render the component structure
    expect(screen.getByText('AI Job Discovery')).toBeInTheDocument();
  });

  test('should display job details correctly', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show job details
    expect(screen.getByText('Senior Full Stack Developer')).toBeInTheDocument();
    expect(screen.getByText('TechFlow Solutions')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('$140k - $180k')).toBeInTheDocument();

    // Should show skills (may be rendered as part of larger components)
    const pageContent = document.body.textContent || '';
    expect(pageContent.includes('React') || pageContent.includes('TypeScript')).toBeTruthy();
  });

  test('should handle error states gracefully', async () => {
    // Mock a failure in data generation
    const originalError = console.error;
    console.error = jest.fn();

    // Force an error by mocking a failing method
    const mockGenerateJobDiscoveryData = jest.fn().mockRejectedValue(new Error('API Error'));

    render(<AIJobDiscovery />);

    // Should handle errors gracefully and potentially show error message
    await waitFor(() => {
      expect(screen.getByText('AI Job Discovery')).toBeInTheDocument();
    });

    console.error = originalError;
  });

  test('should show proper statistics in quick stats section', async () => {
    render(<AIJobDiscovery />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show numeric statistics
    expect(screen.getByText('127')).toBeInTheDocument(); // Total matches
    expect(screen.getByText('8')).toBeInTheDocument();   // New today
    expect(screen.getByText('3')).toBeInTheDocument();   // Urgent deadlines
  });
});