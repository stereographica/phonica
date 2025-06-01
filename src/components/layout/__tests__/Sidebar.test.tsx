import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from '../Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/materials',
}));

describe('Sidebar', () => {
  const defaultProps = {
    isCollapsed: false,
    toggleSidebar: jest.fn(),
    sidebarWidthClass: 'w-64',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sidebar component', () => {
    render(<Sidebar {...defaultProps} />);
    
    // Check if the sidebar navigation is rendered
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('displays navigation links', () => {
    render(<Sidebar {...defaultProps} />);
    
    // Check for navigation links
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Master Data')).toBeInTheDocument();
  });

  it('highlights active link', () => {
    render(<Sidebar {...defaultProps} />);
    
    // Materials should be active based on usePathname mock
    const materialsLink = screen.getByText('Materials').closest('a');
    expect(materialsLink).toHaveClass('bg-secondary');
  });

  it('handles toggle sidebar', () => {
    const mockToggle = jest.fn();
    render(<Sidebar {...defaultProps} toggleSidebar={mockToggle} />);
    
    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);
    
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('renders collapsed state', () => {
    render(<Sidebar {...defaultProps} isCollapsed={true} sidebarWidthClass="w-16" />);
    
    // Check if the sidebar itself has the correct width class
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-16');
  });

  it('renders expanded state', () => {
    render(<Sidebar {...defaultProps} isCollapsed={false} sidebarWidthClass="w-64" />);
    
    // Check if the sidebar itself has the correct width class
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-64');
  });

  it('renders toggle button', () => {
    render(<Sidebar {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(toggleButton).toBeInTheDocument();
  });
});