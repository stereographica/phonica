import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../pagination';

describe('Pagination Components', () => {
  describe('Pagination', () => {
    it('renders with default props', () => {
      render(
        <Pagination data-testid="pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const pagination = screen.getByTestId('pagination');
      expect(pagination).toBeInTheDocument();
      expect(pagination.tagName).toBe('NAV');
    });

    it('applies custom className', () => {
      render(
        <Pagination className="custom-class" data-testid="pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const pagination = screen.getByTestId('pagination');
      expect(pagination).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLElement>();
      render(
        <Pagination ref={ref} data-testid="pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      expect(ref.current).toBeInstanceOf(HTMLElement);
    });
  });

  describe('PaginationContent', () => {
    it('renders correctly', () => {
      render(
        <Pagination>
          <PaginationContent data-testid="pagination-content">
            <PaginationItem>
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const content = screen.getByTestId('pagination-content');
      expect(content).toBeInTheDocument();
      expect(content.tagName).toBe('UL');
    });

    it('applies custom className', () => {
      render(
        <Pagination>
          <PaginationContent className="custom-content" data-testid="pagination-content">
            <PaginationItem>
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const content = screen.getByTestId('pagination-content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('PaginationItem', () => {
    it('renders correctly', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem data-testid="pagination-item">
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const item = screen.getByTestId('pagination-item');
      expect(item).toBeInTheDocument();
      expect(item.tagName).toBe('LI');
    });

    it('applies custom className', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem className="custom-item" data-testid="pagination-item">
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const item = screen.getByTestId('pagination-item');
      expect(item).toHaveClass('custom-item');
    });
  });

  describe('PaginationLink', () => {
    it('renders as anchor when href is provided', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#1" data-testid="pagination-link">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const link = screen.getByTestId('pagination-link');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '#1');
    });

    it('renders as anchor even when no href is provided', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink data-testid="pagination-link">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const link = screen.getByTestId('pagination-link');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
    });

    it('handles active state', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink isActive data-testid="pagination-link">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const link = screen.getByTestId('pagination-link');
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('handles different sizes', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink size="sm" data-testid="pagination-link">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const link = screen.getByTestId('pagination-link');
      expect(link).toHaveClass('h-8', 'text-xs');
    });
  });

  describe('PaginationPrevious', () => {
    it('renders correctly', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#prev" data-testid="pagination-prev">Previous</PaginationPrevious>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const prev = screen.getByTestId('pagination-prev');
      expect(prev).toBeInTheDocument();
      expect(prev).toHaveTextContent('Previous');
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={handleClick} data-testid="pagination-prev">Previous</PaginationPrevious>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const prev = screen.getByTestId('pagination-prev');
      fireEvent.click(prev);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('PaginationNext', () => {
    it('renders correctly', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationNext href="#next" data-testid="pagination-next">Next</PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const next = screen.getByTestId('pagination-next');
      expect(next).toBeInTheDocument();
      expect(next).toHaveTextContent('Next');
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationNext onClick={handleClick} data-testid="pagination-next">Next</PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const next = screen.getByTestId('pagination-next');
      fireEvent.click(next);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('PaginationEllipsis', () => {
    it('renders correctly', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationEllipsis data-testid="pagination-ellipsis" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const ellipsis = screen.getByTestId('pagination-ellipsis');
      expect(ellipsis).toBeInTheDocument();
      expect(ellipsis).toHaveTextContent('More pages');
    });

    it('applies custom className', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationEllipsis className="custom-ellipsis" data-testid="pagination-ellipsis" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      
      const ellipsis = screen.getByTestId('pagination-ellipsis');
      expect(ellipsis).toHaveClass('custom-ellipsis');
    });
  });

  describe('Complete Pagination', () => {
    it('renders complete pagination structure', () => {
      render(
        <Pagination data-testid="complete-pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#prev">Previous</PaginationPrevious>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#1">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#2" isActive>2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#3">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#10">10</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#next">Next</PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      expect(screen.getByTestId('complete-pagination')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('More pages')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });
});