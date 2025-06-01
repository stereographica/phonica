import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption 
} from '../table';

describe('Table Components', () => {
  describe('Table', () => {
    it('renders with default props', () => {
      render(
        <Table data-testid="table">
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const table = screen.getByTestId('table');
      expect(table).toBeInTheDocument();
      expect(table.tagName).toBe('TABLE');
    });

    it('applies custom className', () => {
      render(<Table className="custom-class" data-testid="table" />);
      
      const table = screen.getByTestId('table');
      expect(table).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableElement>();
      render(<Table ref={ref} data-testid="table" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });
  });

  describe('TableHeader', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableHeader data-testid="table-header">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const header = screen.getByTestId('table-header');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('THEAD');
    });
  });

  describe('TableBody', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableBody data-testid="table-body">
            <TableRow>
              <TableCell>Body content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const body = screen.getByTestId('table-body');
      expect(body).toBeInTheDocument();
      expect(body.tagName).toBe('TBODY');
    });
  });

  describe('TableFooter', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableFooter data-testid="table-footer">
            <TableRow>
              <TableCell>Footer content</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );
      
      const footer = screen.getByTestId('table-footer');
      expect(footer).toBeInTheDocument();
      expect(footer.tagName).toBe('TFOOT');
    });
  });

  describe('TableHead', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="table-head">Column Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByTestId('table-head');
      expect(head).toBeInTheDocument();
      expect(head.tagName).toBe('TH');
      expect(head).toHaveTextContent('Column Header');
    });
  });

  describe('TableRow', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-testid="table-row">
              <TableCell>Row content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('table-row');
      expect(row).toBeInTheDocument();
      expect(row.tagName).toBe('TR');
    });
  });

  describe('TableCell', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell data-testid="table-cell">Cell content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('table-cell');
      expect(cell).toBeInTheDocument();
      expect(cell.tagName).toBe('TD');
      expect(cell).toHaveTextContent('Cell content');
    });
  });

  describe('TableCaption', () => {
    it('renders correctly', () => {
      render(
        <Table>
          <TableCaption data-testid="table-caption">Table caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const caption = screen.getByTestId('table-caption');
      expect(caption).toBeInTheDocument();
      expect(caption.tagName).toBe('CAPTION');
      expect(caption).toHaveTextContent('Table caption');
    });
  });

  describe('Complete Table', () => {
    it('renders a complete table structure', () => {
      render(
        <Table data-testid="complete-table">
          <TableCaption>Sales Report</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Widget A</TableCell>
              <TableCell>100</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Widget B</TableCell>
              <TableCell>200</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>300</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByTestId('complete-table')).toBeInTheDocument();
      expect(screen.getByText('Sales Report')).toBeInTheDocument();
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Widget A')).toBeInTheDocument();
      expect(screen.getByText('Widget B')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });
  });
});