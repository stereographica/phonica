import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../alert-dialog';

describe('AlertDialog Components', () => {
  describe('AlertDialog', () => {
    it('renders alert dialog with trigger and content', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open Alert</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alert Title</AlertDialogTitle>
              <AlertDialogDescription>Alert Description</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByText('Open Alert')).toBeInTheDocument();
    });

    it('opens alert dialog when trigger is clicked', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open Alert</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Alert Title</AlertDialogTitle>
            <p>Alert content</p>
          </AlertDialogContent>
        </AlertDialog>
      );

      const trigger = screen.getByText('Open Alert');
      fireEvent.click(trigger);

      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });
  });

  describe('AlertDialogTrigger', () => {
    it('renders as button by default', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Trigger</AlertDialogTrigger>
        </AlertDialog>
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent('Trigger');
    });

    it('applies custom className', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger className="custom-trigger">Trigger</AlertDialogTrigger>
        </AlertDialog>
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('custom-trigger');
    });
  });

  describe('AlertDialogContent', () => {
    it('renders with proper attributes', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent data-testid="alert-content">
            <AlertDialogTitle>Title</AlertDialogTitle>
            Content
          </AlertDialogContent>
        </AlertDialog>
      );

      const content = screen.getByTestId('alert-content');
      expect(content).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent className="custom-content" data-testid="alert-content">
            <AlertDialogTitle>Title</AlertDialogTitle>
            Content
          </AlertDialogContent>
        </AlertDialog>
      );

      const content = screen.getByTestId('alert-content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('AlertDialogHeader', () => {
    it('renders header content', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader data-testid="alert-header">
              <AlertDialogTitle>Header Title</AlertDialogTitle>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      );

      const header = screen.getByTestId('alert-header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('Header Title')).toBeInTheDocument();
    });
  });

  describe('AlertDialogTitle', () => {
    it('renders title correctly', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Test Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialog>
      );

      const title = screen.getByText('Test Title');
      expect(title).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle className="custom-title">Test Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialog>
      );

      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('AlertDialogDescription', () => {
    it('renders description correctly', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Test Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      const description = screen.getByText('Test Description');
      expect(description).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription className="custom-desc">Test Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      const description = screen.getByText('Test Description');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('AlertDialogFooter', () => {
    it('renders footer content', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogFooter data-testid="alert-footer">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const footer = screen.getByTestId('alert-footer');
      expect(footer).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });

  describe('AlertDialogAction', () => {
    it('renders action button', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogAction>Action Button</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );

      const actionButton = screen.getByText('Action Button');
      expect(actionButton).toBeInTheDocument();
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogAction onClick={handleClick}>Action Button</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );

      const actionButton = screen.getByText('Action Button');
      fireEvent.click(actionButton);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('AlertDialogCancel', () => {
    it('renders cancel button', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogCancel>Cancel Button</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      );

      const cancelButton = screen.getByText('Cancel Button');
      expect(cancelButton).toBeInTheDocument();
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogCancel onClick={handleClick}>Cancel Button</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      );

      const cancelButton = screen.getByText('Cancel Button');
      fireEvent.click(cancelButton);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Complete AlertDialog', () => {
    it('renders complete alert dialog structure', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent data-testid="complete-alert">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('complete-alert')).toBeInTheDocument();
      expect(screen.getByText('Delete Confirmation')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });
});