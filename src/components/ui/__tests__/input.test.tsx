import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '../input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} data-testid="input" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input" />);
    
    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies placeholder', () => {
    render(<Input placeholder="Enter text" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
  });

  it('handles disabled state', () => {
    render(<Input disabled data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
  });

  it('handles different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />);
    
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    
    rerender(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    
    rerender(<Input type="number" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
  });

  it('handles required attribute', () => {
    render(<Input required data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeRequired();
  });

  it('passes through other props', () => {
    render(<Input aria-label="Test input" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-label', 'Test input');
  });
});