import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../../../app/login/page';
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
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
  });

  it('renders login form correctly', () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    expect(screen.getByText('Job Tracker')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: TestWrapper });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // HTML5 validation should prevent form submission
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailInput).toBeInvalid();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => ({
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
        token: 'mock-token',
      }),
    };

    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<LoginPage />, { wrapper: TestWrapper });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
    });

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 'user123', email: 'test@example.com', name: 'Test User' })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles login failure', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    };

    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<LoginPage />, { wrapper: TestWrapper });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Should not redirect or set localStorage
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    (fetch as jest.Mock).mockReturnValueOnce(mockPromise);

    render(<LoginPage />, { wrapper: TestWrapper });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Should show loading state
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        user: { id: 'user123', email: 'test@example.com' },
        token: 'mock-token',
      }),
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage />, { wrapper: TestWrapper });

    // Fill in the form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Should not redirect
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('has accessible form elements', () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});