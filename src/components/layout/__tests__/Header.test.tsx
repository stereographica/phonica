import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// モックの設定
jest.mock('@/components/search/GlobalSearch', () => ({
  GlobalSearch: () => <input type="search" placeholder="Search materials..." />,
}));

// テスト用のWrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('Header', () => {
  it('renders the header component', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    // Check if the header is rendered
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('displays the application title', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    // Check if the title is displayed
    expect(screen.getByText('Phonica')).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('border-b');
  });

  it('renders search input', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const searchInput = screen.getByPlaceholderText('Search materials...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'search');
  });

  it('has sticky positioning', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky');
    expect(header).toHaveClass('top-0');
  });
});
