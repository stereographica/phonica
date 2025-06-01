import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toaster } from '../toaster';

// Mock the useToast hook
interface MockToast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: string;
  className?: string;
}
const mockToasts: MockToast[] = [];
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: mockToasts,
    toast: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

// Mock the toast components
jest.mock('@/components/ui/toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
  ToastViewport: () => <div data-testid="toast-viewport" />,
  Toast: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div data-testid="toast-default" {...props}>{children}</div>,
  ToastTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  ToastDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ToastClose: () => <button data-testid="toast-close">×</button>,
}));

describe('Toaster', () => {
  beforeEach(() => {
    // Reset mock toasts
    mockToasts.length = 0;
  });

  it('renders empty when no toasts', () => {
    render(<Toaster />);
    
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
    expect(screen.getByTestId('toast-viewport')).toBeInTheDocument();
    expect(screen.queryByTestId('toast-default')).not.toBeInTheDocument();
  });

  it('renders single toast with title', () => {
    mockToasts.push({
      id: 'toast-1',
      title: 'Success!',
    });

    render(<Toaster />);
    
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByTestId('toast-close')).toBeInTheDocument();
  });

  it('renders single toast with description', () => {
    mockToasts.push({
      id: 'toast-2',
      description: 'Your changes have been saved.',
    });

    render(<Toaster />);
    
    expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
  });

  it('renders toast with both title and description', () => {
    mockToasts.push({
      id: 'toast-3',
      title: 'Success!',
      description: 'Your changes have been saved.',
    });

    render(<Toaster />);
    
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
  });

  it('renders toast with action', () => {
    const mockAction = <button>Undo</button>;
    mockToasts.push({
      id: 'toast-4',
      title: 'Item deleted',
      action: mockAction,
    });

    render(<Toaster />);
    
    expect(screen.getByText('Item deleted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    mockToasts.push(
      {
        id: 'toast-5',
        title: 'First toast',
      },
      {
        id: 'toast-6',
        title: 'Second toast',
      },
      {
        id: 'toast-7',
        title: 'Third toast',
      }
    );

    render(<Toaster />);
    
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.getByText('Third toast')).toBeInTheDocument();
  });

  it('passes additional props to Toast component', () => {
    mockToasts.push({
      id: 'toast-8',
      title: 'Error!',
      variant: 'destructive',
      className: 'custom-toast',
    });

    render(<Toaster />);
    
    const toast = screen.getByTestId('toast-default');
    expect(toast).toHaveAttribute('variant', 'destructive');
    expect(toast).toHaveClass('custom-toast');
  });

  it('renders toast without title or description', () => {
    mockToasts.push({
      id: 'toast-9',
    });

    render(<Toaster />);
    
    const toast = screen.getByTestId('toast-default');
    expect(toast).toBeInTheDocument();
    expect(toast.querySelector('h3')).toBeNull();
    expect(toast.querySelector('p')).toBeNull();
  });

  it('renders complex toast with all elements', () => {
    const mockAction = (
      <button className="action-button">
        View Details
      </button>
    );
    
    mockToasts.push({
      id: 'toast-10',
      title: 'New message received',
      description: 'You have a new message from John Doe',
      action: mockAction,
      variant: 'default',
    });

    render(<Toaster />);
    
    expect(screen.getByText('New message received')).toBeInTheDocument();
    expect(screen.getByText('You have a new message from John Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    expect(screen.getByTestId('toast-close')).toBeInTheDocument();
  });
});