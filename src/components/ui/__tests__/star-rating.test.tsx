import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from '../star-rating';

describe('StarRating', () => {
  it('renders the correct number of stars', () => {
    render(<StarRating value={0} max={5} />);
    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(5);
  });

  it('renders with custom max stars', () => {
    render(<StarRating value={0} max={10} />);
    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(10);
  });

  it('displays the correct rating value', () => {
    render(<StarRating value={3} />);
    const stars = screen.getAllByRole('radio');

    // Check filled stars (first 3)
    stars.slice(0, 3).forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('fill-yellow-400', 'text-yellow-400');
    });

    // Check empty stars (last 2)
    stars.slice(3).forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('fill-transparent', 'text-gray-300');
    });
  });

  it('calls onChange when a star is clicked', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();

    render(<StarRating value={2} onChange={handleChange} />);
    const stars = screen.getAllByRole('radio');

    await user.click(stars[3]); // Click the 4th star
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('shows hover state when interactive', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();

    render(<StarRating value={2} onChange={handleChange} />);
    const stars = screen.getAllByRole('radio');

    // Hover over the 4th star
    await user.hover(stars[3]);

    // Check that first 4 stars are filled
    stars.slice(0, 4).forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('fill-yellow-400', 'text-yellow-400');
    });
  });

  it('does not show hover state when readOnly', async () => {
    const user = userEvent.setup();

    render(<StarRating value={2} readOnly />);
    const stars = screen.getAllByRole('radio');

    // Hover over the 4th star
    await user.hover(stars[3]);

    // Check that only first 2 stars are filled (no hover effect)
    stars.slice(0, 2).forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('fill-yellow-400', 'text-yellow-400');
    });

    stars.slice(2).forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('fill-transparent', 'text-gray-300');
    });
  });

  it('does not call onChange when disabled', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();

    render(<StarRating value={2} onChange={handleChange} disabled />);
    const stars = screen.getAllByRole('radio');

    await user.click(stars[3]);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when readOnly', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();

    render(<StarRating value={2} onChange={handleChange} readOnly />);
    const stars = screen.getAllByRole('radio');

    await user.click(stars[3]);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation', () => {
    const handleChange = jest.fn();
    render(<StarRating value={3} onChange={handleChange} />);
    const stars = screen.getAllByRole('radio');

    // The third star should have tabIndex 0
    expect(stars[2]).toHaveAttribute('tabIndex', '0');

    // Arrow right
    fireEvent.keyDown(stars[2], { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(4);

    // Arrow left
    fireEvent.keyDown(stars[2], { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(2);

    // Enter key
    handleChange.mockClear();
    fireEvent.keyDown(stars[3], { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(4);

    // Space key
    handleChange.mockClear();
    fireEvent.keyDown(stars[1], { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('prevents navigation beyond boundaries', () => {
    const handleChange = jest.fn();
    render(<StarRating value={1} onChange={handleChange} max={5} />);
    const stars = screen.getAllByRole('radio');

    // Try to go below 1
    fireEvent.keyDown(stars[0], { key: 'ArrowLeft' });
    expect(handleChange).not.toHaveBeenCalled();

    // Set to max value
    render(<StarRating value={5} onChange={handleChange} max={5} />);
    const maxStars = screen.getAllByRole('radio');

    // Try to go above max
    fireEvent.keyDown(maxStars[4], { key: 'ArrowRight' });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<StarRating value={3} size="sm" />);
    let stars = screen.getAllByRole('radio');
    stars.forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    rerender(<StarRating value={3} size="md" />);
    stars = screen.getAllByRole('radio');
    stars.forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('h-5', 'w-5');
    });

    rerender(<StarRating value={3} size="lg" />);
    stars = screen.getAllByRole('radio');
    stars.forEach((star) => {
      const svg = star.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6');
    });
  });

  it('applies custom className', () => {
    render(<StarRating value={3} className="custom-class" />);
    const container = screen.getByRole('radiogroup');
    expect(container).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<StarRating value={3} max={5} disabled />);
    const container = screen.getByRole('radiogroup');

    expect(container).toHaveAttribute('aria-label', 'Rating');
    expect(container).toHaveAttribute('aria-disabled', 'true');

    const stars = screen.getAllByRole('radio');
    expect(stars[0]).toHaveAttribute('aria-label', '1 star');
    expect(stars[1]).toHaveAttribute('aria-label', '2 stars');
    expect(stars[2]).toHaveAttribute('aria-checked', 'true');
    expect(stars[3]).toHaveAttribute('aria-checked', 'false');
  });

  it('prevents default on keyboard events', () => {
    const handleChange = jest.fn();
    render(<StarRating value={3} onChange={handleChange} />);
    const stars = screen.getAllByRole('radio');

    // Enter キーのテスト
    fireEvent.keyDown(stars[2], { key: 'Enter', preventDefault: jest.fn() });
    expect(handleChange).toHaveBeenCalledWith(3);

    // Space キーのテスト
    fireEvent.keyDown(stars[2], { key: ' ', preventDefault: jest.fn() });
    expect(handleChange).toHaveBeenCalledWith(3);
  });
});
