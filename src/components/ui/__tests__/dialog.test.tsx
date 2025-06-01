import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription,
  DialogClose 
} from '../dialog';

describe('Dialog Components', () => {
  describe('Dialog', () => {
    it('renders dialog trigger and content', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog Description</DialogDescription>
            </DialogHeader>
            <p>Dialog content</p>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <p>Dialog content</p>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByText('Open Dialog');
      fireEvent.click(trigger);

      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });
  });

  describe('DialogTrigger', () => {
    it('renders as button by default', () => {
      render(
        <Dialog>
          <DialogTrigger>Trigger</DialogTrigger>
        </Dialog>
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent('Trigger');
    });
  });

  describe('DialogContent', () => {
    it('renders with proper attributes', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Title</DialogTitle>
            Content
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('renders header content', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Header Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('Header Title')).toBeInTheDocument();
    });
  });

  describe('DialogTitle', () => {
    it('renders title correctly', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Test Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Test Title');
      expect(title).toBeInTheDocument();
    });
  });

  describe('DialogDescription', () => {
    it('renders description correctly', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Test Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText('Test Description');
      expect(description).toBeInTheDocument();
    });
  });

  describe('DialogFooter', () => {
    it('renders footer content', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter data-testid="dialog-footer">
              <button>Cancel</button>
              <button>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByTestId('dialog-footer');
      expect(footer).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('DialogClose', () => {
    it('renders close button', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogClose>Close Dialog</DialogClose>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByText('Close Dialog');
      expect(closeButton).toBeInTheDocument();
    });
  });
});