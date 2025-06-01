import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('renders with default state', () => {
    render(<Checkbox data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('renders checked state', () => {
    render(<Checkbox checked data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('renders disabled state', () => {
    render(<Checkbox disabled data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Checkbox className="custom-checkbox" data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('custom-checkbox');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Checkbox ref={ref} data-testid="checkbox" />);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('handles indeterminate state', () => {
    render(<Checkbox checked="indeterminate" data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('passes through other props', () => {
    render(<Checkbox aria-label="Test checkbox" data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'Test checkbox');
  });
});