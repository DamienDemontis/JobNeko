import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import RegisterPage from '../../../app/register/page';
import { useAuth } from '@/contexts/AuthContext';

// Create a custom test wrapper that provides a fresh AuthContext for each test
const TestWrapperWithFreshAuth = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="auth-wrapper">
      {children}
    </div>
  );
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the AuthContext to prevent state leakage between tests
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
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

const mockLogin = jest.fn((user, token) => {
  // Simulate the real login function behavior
  mockLocalStorage.setItem('token', token);
  mockLocalStorage.setItem('user', JSON.stringify(user));
});
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockLocalStorage = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all router mocks completely
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.prefetch.mockClear();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Reset AuthContext mock - no user logged in by default
    mockLogin.mockClear();
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      login: mockLogin,
      logout: jest.fn(),
    });

    // Clear fetch mock completely
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockReset();

    // Reset localStorage to ensure clean state between tests
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();

    // Ensure localStorage returns null for all keys initially
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    // Additional cleanup to ensure no state leaks between tests
    jest.clearAllMocks();

    // Clear any remaining mock call history
    mockRouter.push.mockClear();
    mockLocalStorage.setItem.mockClear();

    // Reset fetch mock completely for next test
    (fetch as jest.Mock).mockReset();
  });

  it('renders registration form correctly', () => {
    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    expect(screen.getByText('Job Tracker')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles successful registration', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => ({
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
        token: 'mock-token',
      }),
    };

    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Test User');
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/register', 
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test@example.com'),
        })
      );
    });

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles registration failure', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'User already exists' }),
    };

    // Clear any previous mock implementations and set new one
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify the fetch was called with the right parameters
    expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'password123',
        name: ''
      })
    });

    // Wait for async operations to complete
    await waitFor(() => {
      // Should not redirect or set localStorage on failure
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('minLength', '6');
    
    // Type a short password and blur to trigger validation
    await user.type(passwordInput, '123');
    await user.tab(); // Trigger blur event
    
    // The minLength attribute should be present for client-side validation
    expect(passwordInput).toHaveAttribute('minLength', '6');
  });

  it('shows loading state during registration', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    (fetch as jest.Mock).mockReturnValueOnce(mockPromise);

    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Should show loading state
    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        user: { id: 'user123', email: 'test@example.com' },
        token: 'mock-token',
      }),
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /creating account/i })).not.toBeInTheDocument();
    });
  });

  it('allows optional name field', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => ({
        user: { id: 'user123', email: 'test@example.com' },
        token: 'mock-token',
      }),
    };

    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    // Fill in form without name
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('has accessible form elements', () => {
    render(<RegisterPage />, { wrapper: TestWrapperWithFreshAuth });

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    expect(nameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('minLength', '6');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});