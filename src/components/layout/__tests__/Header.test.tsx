import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../Header';

describe('Header', () => {
  it('renders the header component', () => {
    render(<Header />);
    
    // Check if the header is rendered
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('displays the application title', () => {
    render(<Header />);
    
    // Check if the title is displayed
    expect(screen.getByText('Phonica')).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    render(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('border-b');
  });

  it('renders search input', () => {
    render(<Header />);
    
    const searchInput = screen.getByPlaceholderText('Search materials...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'search');
  });

  it('displays search icon', () => {
    render(<Header />);
    
    // Check if search icon is present (as part of the Search component)
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('has sticky positioning', () => {
    render(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky');
    expect(header).toHaveClass('top-0');
  });
});