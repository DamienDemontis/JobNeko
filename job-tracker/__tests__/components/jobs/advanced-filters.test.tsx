import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedFilters, type JobFilters } from '@/components/jobs/advanced-filters';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Briefcase: () => <div data-testid="briefcase-icon" />,
  Building: () => <div data-testid="building-icon" />,
  Gift: () => <div data-testid="gift-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Code2: () => <div data-testid="code-icon" />,
  Building2: () => <div data-testid="building2-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
}));

// Mock salary intelligence functions
jest.mock('@/lib/salary-intelligence', () => ({
  analyzeSalary: jest.fn(),
  getComfortColor: jest.fn(() => 'text-blue-600'),
  getComfortIcon: jest.fn(() => '😊'),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div role="tablist" {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button role="tab" aria-selected={false} {...props}>{children}</button>
  ),
  TabsContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div onClick={() => onValueChange?.('test')}>{children}</div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div onClick={() => {}}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input 
      type="checkbox" 
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

describe('AdvancedFilters Component', () => {
  const mockOnFiltersChange = jest.fn();
  const defaultProps = {
    filters: {},
    onFiltersChange: mockOnFiltersChange,
    jobCount: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all filter tabs', () => {
    render(<AdvancedFilters {...defaultProps} />);

    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Benefits')).toBeInTheDocument();
  });

  it('should display job count', () => {
    render(<AdvancedFilters {...defaultProps} />);
    expect(screen.getByText('42 jobs match your criteria')).toBeInTheDocument();
  });

  describe('Salary Tab', () => {
    it('should render salary comfort levels', () => {
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Salary tab
      fireEvent.click(screen.getByText('Salary'));

      expect(screen.getByText('😰 Struggling')).toBeInTheDocument();
      expect(screen.getByText('😓 Tight Budget')).toBeInTheDocument();
      expect(screen.getByText('😊 Comfortable')).toBeInTheDocument();
      expect(screen.getByText('😄 Thriving')).toBeInTheDocument();
      expect(screen.getByText('🤩 Luxurious')).toBeInTheDocument();
    });

    it('should handle comfort level selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Salary tab
      await user.click(screen.getByText('Salary'));
      
      // Click on comfortable level
      await user.click(screen.getByText('😊 Comfortable'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            comfortLevel: ['comfortable']
          })
        );
      });
    });

    it('should handle salary range inputs', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Salary tab
      await user.click(screen.getByText('Salary'));
      
      // Find and fill min salary input
      const minSalaryInput = screen.getByLabelText('Minimum Salary');
      await user.type(minSalaryInput, '80000');

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            salaryMin: 80000
          })
        );
      });
    });

    it('should handle currency selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Salary tab
      await user.click(screen.getByText('Salary'));
      
      // Find and click currency selector
      const currencySelect = screen.getByLabelText('Currency');
      await user.click(currencySelect);
      
      // Select EUR
      await user.click(screen.getByText('EUR'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            currency: 'EUR'
          })
        );
      });
    });
  });

  describe('Location Tab', () => {
    it('should render work mode options', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Location tab
      await user.click(screen.getByText('Location'));

      expect(screen.getByText('🏠 Remote')).toBeInTheDocument();
      expect(screen.getByText('🏢 Hybrid')).toBeInTheDocument();
      expect(screen.getByText('🏬 On-site')).toBeInTheDocument();
    });

    it('should handle work mode selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Location tab
      await user.click(screen.getByText('Location'));
      
      // Click on Remote
      await user.click(screen.getByText('🏠 Remote'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            workMode: ['remote']
          })
        );
      });
    });

    it('should handle remote option toggle', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Location tab
      await user.click(screen.getByText('Location'));
      
      // Find and toggle remote option
      const remoteToggle = screen.getByRole('checkbox', { name: /must have remote option/i });
      await user.click(remoteToggle);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            hasRemoteOption: true
          })
        );
      });
    });
  });

  describe('Experience Tab', () => {
    it('should render experience levels', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Experience tab
      await user.click(screen.getByText('Experience'));

      expect(screen.getByText('🌱 Entry Level')).toBeInTheDocument();
      expect(screen.getByText('📈 Mid-Level')).toBeInTheDocument();
      expect(screen.getByText('🏆 Senior')).toBeInTheDocument();
      expect(screen.getByText('👑 Lead')).toBeInTheDocument();
      expect(screen.getByText('🚀 Principal')).toBeInTheDocument();
      expect(screen.getByText('💼 Executive')).toBeInTheDocument();
    });

    it('should handle experience level selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Experience tab
      await user.click(screen.getByText('Experience'));
      
      // Click on Senior
      await user.click(screen.getByText('🏆 Senior'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            experienceLevel: ['senior']
          })
        );
      });
    });
  });

  describe('Company Tab', () => {
    it('should render company size options', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Company tab
      await user.click(screen.getByText('Company'));

      expect(screen.getByText('🚀 Startup')).toBeInTheDocument();
      expect(screen.getByText('🏪 Small')).toBeInTheDocument();
      expect(screen.getByText('🏢 Medium')).toBeInTheDocument();
      expect(screen.getByText('🏬 Large')).toBeInTheDocument();
      expect(screen.getByText('🏛️ Enterprise')).toBeInTheDocument();
    });

    it('should handle company size selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Company tab
      await user.click(screen.getByText('Company'));
      
      // Click on Startup
      await user.click(screen.getByText('🚀 Startup'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            companySize: ['startup']
          })
        );
      });
    });
  });

  describe('Benefits Tab', () => {
    it('should render benefit options', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Benefits tab
      await user.click(screen.getByText('Benefits'));

      expect(screen.getByText('💰 Equity/Stock Options')).toBeInTheDocument();
      expect(screen.getByText('🏥 Health Insurance')).toBeInTheDocument();
      expect(screen.getByText('🦷 Dental & Vision')).toBeInTheDocument();
      expect(screen.getByText('🏖️ Unlimited PTO')).toBeInTheDocument();
    });

    it('should handle benefit selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Benefits tab
      await user.click(screen.getByText('Benefits'));
      
      // Click on equity option
      await user.click(screen.getByText('💰 Equity/Stock Options'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            benefits: ['equity']
          })
        );
      });
    });
  });

  describe('Quick Filters', () => {
    it('should render quick filter buttons', () => {
      render(<AdvancedFilters {...defaultProps} />);

      expect(screen.getByText('🏠 Remote Only')).toBeInTheDocument();
      expect(screen.getByText('💰 High Salary')).toBeInTheDocument();
      expect(screen.getByText('🚀 Startups')).toBeInTheDocument();
      expect(screen.getByText('🏆 Senior Roles')).toBeInTheDocument();
    });

    it('should handle quick filter selection', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Remote Only quick filter
      await user.click(screen.getByText('🏠 Remote Only'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            workMode: ['remote']
          })
        );
      });
    });

    it('should handle high salary quick filter', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on High Salary quick filter
      await user.click(screen.getByText('💰 High Salary'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            comfortLevel: ['thriving', 'luxurious']
          })
        );
      });
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters', async () => {
      const user = userEvent.setup();
      const filtersWithValues: JobFilters = {
        workMode: ['remote'],
        comfortLevel: ['comfortable'],
        experienceLevel: ['senior'],
        companySize: ['startup'],
      };
      
      render(
        <AdvancedFilters 
          filters={filtersWithValues}
          onFiltersChange={mockOnFiltersChange}
          jobCount={10}
        />
      );
      
      // Click clear filters button
      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Filter State Management', () => {
    it('should display active filter count', () => {
      const filtersWithValues: JobFilters = {
        workMode: ['remote', 'hybrid'],
        comfortLevel: ['comfortable'],
        experienceLevel: ['senior'],
      };
      
      render(
        <AdvancedFilters 
          filters={filtersWithValues}
          onFiltersChange={mockOnFiltersChange}
          jobCount={5}
        />
      );

      // Should show active filters indicator
      expect(screen.getByText('4 active filters')).toBeInTheDocument();
    });

    it('should handle multiple selections in the same category', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Click on Location tab
      await user.click(screen.getByText('Location'));
      
      // Select multiple work modes
      await user.click(screen.getByText('🏠 Remote'));
      await user.click(screen.getByText('🏢 Hybrid'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenLastCalledWith(
          expect.objectContaining({
            workMode: ['remote', 'hybrid']
          })
        );
      });
    });

    it('should handle deselection', async () => {
      const user = userEvent.setup();
      const filtersWithValues: JobFilters = {
        workMode: ['remote', 'hybrid'],
      };
      
      render(
        <AdvancedFilters 
          filters={filtersWithValues}
          onFiltersChange={mockOnFiltersChange}
          jobCount={5}
        />
      );
      
      // Click on Location tab
      await user.click(screen.getByText('Location'));
      
      // Deselect remote (should be active/selected)
      await user.click(screen.getByText('🏠 Remote'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            workMode: ['hybrid']
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AdvancedFilters {...defaultProps} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Salary' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Location' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AdvancedFilters {...defaultProps} />);
      
      // Tab to first tab and press Enter
      await user.tab();
      await user.keyboard('{Enter}');
      
      // Should activate the tab
      expect(screen.getByRole('tab', { selected: true })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero job count', () => {
      render(
        <AdvancedFilters 
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
          jobCount={0}
        />
      );
      
      expect(screen.getByText('No jobs match your criteria')).toBeInTheDocument();
    });

    it('should handle very high job count', () => {
      render(
        <AdvancedFilters 
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
          jobCount={9999}
        />
      );
      
      expect(screen.getByText('9,999 jobs match your criteria')).toBeInTheDocument();
    });

    it('should handle undefined filters gracefully', () => {
      render(
        <AdvancedFilters 
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
          jobCount={42}
        />
      );
      
      // Should render without crashing
      expect(screen.getByText('42 jobs match your criteria')).toBeInTheDocument();
    });
  });
});