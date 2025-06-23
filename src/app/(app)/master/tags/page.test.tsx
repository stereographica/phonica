/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagsMasterPage from './page';
import { useNotification } from '@/hooks/use-notification';

// モックの設定
jest.mock('@/hooks/use-notification');
jest.mock('@/components/master/TagFormModal', () => ({
  TagFormModal: jest.fn(({ isOpen, onOpenChange, initialData, onSuccess }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="tag-form-modal">
        <h2>{initialData ? 'Edit Tag' : 'New Tag'}</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button
          onClick={() => {
            onSuccess();
            onOpenChange(false);
          }}
        >
          Save
        </button>
      </div>
    );
  }),
}));

const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();

describe('TagsMasterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNotification as jest.Mock).mockReturnValue({
      notifyError: mockNotifyError,
      notifySuccess: mockNotifySuccess,
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Data fetching', () => {
    it('should display tags list successfully', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Nature', slug: 'nature', _count: { materials: 5 } },
        { id: 'tag-2', name: 'Urban', slug: 'urban', _count: { materials: 3 } },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature')).toBeInTheDocument();
        expect(screen.getByText('Urban')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should handle fetch error with non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Error: HTTP error! status: 500')).toBeInTheDocument();
      });
    });

    it('should handle fetch error with exception', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });

    it('should handle non-Error exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/An unknown error occurred while fetching tags/i),
        ).toBeInTheDocument();
      });
    });

    it('should retry fetching after error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: [] }),
        });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('Error: Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tag operations', () => {
    beforeEach(async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Nature', slug: 'nature', _count: { materials: 0 } },
        { id: 'tag-2', name: 'Urban', slug: 'urban', _count: { materials: 3 } },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature')).toBeInTheDocument();
      });
    });

    it('should open new tag modal when clicking New Tag button', async () => {
      const user = userEvent.setup();
      const newTagButton = screen.getByRole('button', { name: /New Tag/i });

      await user.click(newTagButton);

      expect(screen.getByTestId('tag-form-modal')).toBeInTheDocument();
      // モーダル内のテキストを確認（モーダル内にスコープを限定）
      const modal = screen.getByTestId('tag-form-modal');
      expect(modal).toHaveTextContent('New Tag');
    });

    it('should open edit modal when clicking rename action', async () => {
      const user = userEvent.setup();

      // 最初のタグのアクションメニューを開く
      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const renameButton = screen.getByText('Rename');
      await user.click(renameButton);

      expect(screen.getByTestId('tag-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Edit Tag')).toBeInTheDocument();
    });

    it('should show merge alert when clicking merge action', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const mergeButton = screen.getByText('Merge');
      await user.click(mergeButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Merge functionality for "Nature" will be implemented in a future update.',
      );

      alertSpy.mockRestore();
    });

    it('should open delete confirmation dialog', async () => {
      const user = userEvent.setup();

      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete the tag "Nature"/)).toBeInTheDocument();
    });

    it('should disable delete for tags with materials', async () => {
      const user = userEvent.setup();

      // Urban タグ（3つの素材を持つ）のアクションメニューを開く
      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[1]);

      const deleteButton = screen.getByText('Delete (3 materials)');
      expect(deleteButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should delete tag successfully', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // Nature タグのアクションメニューを開く
      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      // 確認ダイアログでDeleteをクリック
      const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'tag');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/master/tags/tag-1', {
        method: 'DELETE',
      });
    });

    it('should handle delete error with error message', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete tag' }),
      });

      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalledWith(expect.any(Error), {
          operation: 'delete',
          entity: 'tag',
        });
      });
    });

    it('should handle delete error without error message', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'HTTP error! status: 500' }),
          { operation: 'delete', entity: 'tag' },
        );
      });
    });

    it('should handle delete exception', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const actionButtons = screen.getAllByRole('button', { name: 'Open menu' });
      await user.click(actionButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalledWith(expect.any(Error), {
          operation: 'delete',
          entity: 'tag',
        });
      });
    });

    it('should refresh tags after successful modal save', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tags: [{ id: 'tag-new', name: 'New Tag', slug: 'new-tag', _count: { materials: 0 } }],
        }),
      });

      const newTagButton = screen.getByRole('button', { name: /New Tag/i });
      await user.click(newTagButton);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2); // Initial fetch + refresh
      });
    });
  });

  describe('Loading and empty states', () => {
    it('should display loading state', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<TagsMasterPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle empty tags list', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: [] }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Tag Management')).toBeInTheDocument();
        expect(screen.queryByRole('row')).toBeInTheDocument(); // Header row exists
      });
    });

    it('should handle missing tags property in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing tags property
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Tag Management')).toBeInTheDocument();
      });
    });
  });
});
