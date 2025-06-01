import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Slider } from '../slider';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Slider', () => {
  it('renders with default props', () => {
    render(<Slider data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('renders with custom value', () => {
    render(<Slider value={[50]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Slider onValueChange={handleChange} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Slider className="custom-class" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<React.ElementRef<typeof Slider>>();
    render(<Slider ref={ref} data-testid="slider" />);
    
    expect(ref.current).toBeTruthy();
  });

  it('handles min and max values', () => {
    render(<Slider min={0} max={100} value={[25]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('handles step value', () => {
    render(<Slider step={5} value={[25]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Slider disabled data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('data-disabled');
  });

  it('handles multiple values', () => {
    render(<Slider value={[25, 75]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('handles orientation', () => {
    render(<Slider orientation="vertical" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('data-orientation', 'vertical');
  });

  it('passes through other props', () => {
    render(<Slider aria-label="Volume slider" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('aria-label', 'Volume slider');
  });
});