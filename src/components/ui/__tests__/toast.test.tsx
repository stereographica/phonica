import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../toast';

// Mock Radix UI Toast primitives
jest.mock('@radix-ui/react-toast', () => {
  const ProviderComponent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  ProviderComponent.displayName = 'Provider';
  
  const ViewportComponent = React.forwardRef<HTMLDivElement, { children?: React.ReactNode; className?: string }>(({ children, className, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>{children}</div>
  ));
  ViewportComponent.displayName = 'Viewport';
  
  const RootComponent = React.forwardRef<HTMLDivElement, { children?: React.ReactNode; className?: string }>(({ children, className, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>{children}</div>
  ));
  RootComponent.displayName = 'Root';
  
  const ActionComponent = React.forwardRef<HTMLButtonElement, { children?: React.ReactNode; className?: string }>(({ children, className, ...props }, ref) => (
    <button ref={ref} className={className} {...props}>{children}</button>
  ));
  ActionComponent.displayName = 'Action';
  
  const CloseComponent = React.forwardRef<HTMLButtonElement, { children?: React.ReactNode; className?: string }>(({ children, className, ...props }, ref) => (
    <button ref={ref} className={className} {...props}>{children}</button>
  ));
  CloseComponent.displayName = 'Close';
  
  const TitleComponent = React.forwardRef<HTMLHeadingElement, { children?: React.ReactNode; className?: string }>(({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={className} {...props}>{children}</h3>
  ));
  TitleComponent.displayName = 'Title';
  
  const DescriptionComponent = React.forwardRef<HTMLParagraphElement, { children?: React.ReactNode; className?: string }>(({ children, className, ...props }, ref) => (
    <p ref={ref} className={className} {...props}>{children}</p>
  ));
  DescriptionComponent.displayName = 'Description';
  
  return {
    Provider: ProviderComponent,
    Viewport: ViewportComponent,
    Root: RootComponent,
    Action: ActionComponent,
    Close: CloseComponent,
    Title: TitleComponent,
    Description: DescriptionComponent,
  };
});

describe('Toast Components', () => {
  describe('ToastProvider', () => {
    it('renders children', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('ToastViewport', () => {
    it('renders with default styles', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="toast-viewport">
            <div>Toast content</div>
          </ToastViewport>
        </ToastProvider>
      );
      
      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toBeInTheDocument();
      expect(viewport).toHaveClass('fixed', 'top-0', 'z-[100]');
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <ToastViewport className="custom-viewport" data-testid="toast-viewport">
            <div>Toast content</div>
          </ToastViewport>
        </ToastProvider>
      );
      
      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toHaveClass('custom-viewport');
    });
  });

  describe('Toast', () => {
    it('renders with default variant', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast">
            <ToastTitle>Default Toast</ToastTitle>
          </Toast>
        </ToastProvider>
      );
      
      const toast = screen.getByTestId('toast');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('border', 'bg-background');
    });

    it('renders with destructive variant', () => {
      render(
        <ToastProvider>
          <Toast variant="destructive" data-testid="toast">
            <ToastTitle>Error Toast</ToastTitle>
          </Toast>
        </ToastProvider>
      );
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('destructive', 'border-destructive');
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast className="custom-toast" data-testid="toast">
            <ToastTitle>Custom Toast</ToastTitle>
          </Toast>
        </ToastProvider>
      );
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('custom-toast');
    });
  });

  describe('ToastAction', () => {
    it('renders as button', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Undo action">Undo</ToastAction>
          </Toast>
        </ToastProvider>
      );
      
      const action = screen.getByRole('button', { name: /undo/i });
      expect(action).toBeInTheDocument();
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Retry action" onClick={handleClick}>Retry</ToastAction>
          </Toast>
        </ToastProvider>
      );
      
      const action = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(action);
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Custom action" className="custom-action">Action</ToastAction>
          </Toast>
        </ToastProvider>
      );
      
      const action = screen.getByRole('button', { name: /action/i });
      expect(action).toHaveClass('custom-action');
    });
  });

  describe('ToastClose', () => {
    it('renders close button with X icon', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose data-testid="toast-close" />
          </Toast>
        </ToastProvider>
      );
      
      const closeButton = screen.getByTestId('toast-close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('toast-close', '');
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(
        <ToastProvider>
          <Toast>
            <ToastClose onClick={handleClick} data-testid="toast-close" />
          </Toast>
        </ToastProvider>
      );
      
      const closeButton = screen.getByTestId('toast-close');
      fireEvent.click(closeButton);
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose className="custom-close" data-testid="toast-close" />
          </Toast>
        </ToastProvider>
      );
      
      const closeButton = screen.getByTestId('toast-close');
      expect(closeButton).toHaveClass('custom-close');
    });
  });

  describe('ToastTitle', () => {
    it('renders title text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Success!</ToastTitle>
          </Toast>
        </ToastProvider>
      );
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('applies styling classes', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle data-testid="toast-title">Title</ToastTitle>
          </Toast>
        </ToastProvider>
      );
      
      const title = screen.getByTestId('toast-title');
      expect(title).toHaveClass('text-sm', 'font-semibold');
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle className="custom-title">Title</ToastTitle>
          </Toast>
        </ToastProvider>
      );
      
      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('ToastDescription', () => {
    it('renders description text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription>Your action was successful.</ToastDescription>
          </Toast>
        </ToastProvider>
      );
      
      expect(screen.getByText('Your action was successful.')).toBeInTheDocument();
    });

    it('applies styling classes', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription data-testid="toast-desc">Description</ToastDescription>
          </Toast>
        </ToastProvider>
      );
      
      const description = screen.getByTestId('toast-desc');
      expect(description).toHaveClass('text-sm', 'opacity-90');
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription className="custom-desc">Description</ToastDescription>
          </Toast>
        </ToastProvider>
      );
      
      const description = screen.getByText('Description');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('Complete Toast', () => {
    it('renders full toast structure', () => {
      render(
        <ToastProvider>
          <ToastViewport>
            <Toast>
              <div className="grid gap-1">
                <ToastTitle>Scheduled: Catch up</ToastTitle>
                <ToastDescription>Friday, February 10, 2023 at 5:57 PM</ToastDescription>
              </div>
              <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
              <ToastClose />
            </Toast>
          </ToastViewport>
        </ToastProvider>
      );

      expect(screen.getByText('Scheduled: Catch up')).toBeInTheDocument();
      expect(screen.getByText('Friday, February 10, 2023 at 5:57 PM')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    });
  });
});