import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Label } from '../label';

describe('Label', () => {
  it('renders with default props', () => {
    render(<Label data-testid="label">Test Label</Label>);
    
    const label = screen.getByTestId('label');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveTextContent('Test Label');
  });

  it('applies custom className', () => {
    render(<Label className="custom-class" data-testid="label">Label</Label>);
    
    const label = screen.getByTestId('label');
    expect(label).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref} data-testid="label">Label</Label>);
    
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('handles htmlFor attribute', () => {
    render(<Label htmlFor="input-id" data-testid="label">Label for input</Label>);
    
    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('for', 'input-id');
  });

  it('passes through other props', () => {
    render(<Label title="Label title" data-testid="label">Label</Label>);
    
    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('title', 'Label title');
  });

  it('handles disabled peer state styling', () => {
    render(<Label className="peer-disabled:cursor-not-allowed" data-testid="label">Label</Label>);
    
    const label = screen.getByTestId('label');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
  });

  it('renders with children elements', () => {
    render(
      <Label data-testid="label">
        <span>Icon</span>
        Label Text
      </Label>
    );
    
    const label = screen.getByTestId('label');
    expect(label).toHaveTextContent('IconLabel Text');
    expect(label.querySelector('span')).toBeInTheDocument();
  });
});