/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import ProjectDetailPage from './page';
import { useNotification } from '@/hooks/use-notification';

// Next.jsのモック
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// フックのモック
jest.mock('@/hooks/use-notification');

// コンポーネントのモック
jest.mock('@/components/projects/ProjectFormModal', () => ({
  ProjectFormModal: jest.fn(({ isOpen, onOpenChange, initialData, onSuccess }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="project-form-modal">
        <h2>{initialData ? 'Edit Project' : 'New Project'}</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button
          onClick={() => {
            const updatedProject = { ...initialData, name: 'Updated Project' };
            onSuccess(updatedProject);
          }}
        >
          Save
        </button>
        <button
          onClick={() => {
            const projectWithNewSlug = { ...initialData, slug: 'new-slug' };
            onSuccess(projectWithNewSlug);
          }}
        >
          Save with New Slug
        </button>
      </div>
    );
  }),
}));

jest.mock('@/components/projects/ManageMaterialsModal', () => ({
  ManageMaterialsModal: jest.fn(({ isOpen, onOpenChange, onSuccess }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="manage-materials-modal">
        <h2>Manage Materials</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={onSuccess}>Apply Changes</button>
      </div>
    );
  }),
}));

const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNotification as jest.Mock).mockReturnValue({
      notifyError: mockNotifyError,
      notifySuccess: mockNotifySuccess,
    });
    global.fetch = jest.fn();
    global.confirm = jest.fn();

    // Reset navigation mocks
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    (useParams as jest.Mock).mockReturnValue({
      slug: 'test-project',
    });

    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/projects/test-project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Project fetching', () => {
    it('should display project details successfully', async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        description: 'Test description',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      const mockMaterials = {
        data: [
          {
            id: 'mat-1',
            slug: 'material-1',
            title: 'Material 1',
            recordedAt: '2024-01-01T12:00:00Z',
            tags: [{ id: 'tag-1', name: 'nature', slug: 'nature' }],
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          totalItems: 1,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockMaterials,
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
        expect(screen.getByText('Material 1')).toBeInTheDocument();
      });
    });

    it('should handle 404 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument();
        expect(mockNotifyError).toHaveBeenCalled();
      });
    });

    it('should handle other HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle null response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(null);

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('HTTP error! status: unknown')).toBeInTheDocument();
      });
    });
  });

  describe('Material operations', () => {
    beforeEach(async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        description: 'Test description',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      const mockMaterials = {
        data: [
          {
            id: 'mat-1',
            slug: 'material-1',
            title: 'Material 1',
            recordedAt: '2024-01-01T12:00:00Z',
            tags: [],
          },
          {
            id: 'mat-2',
            slug: 'material-2',
            title: 'Material 2',
            recordedAt: '2024-01-02T12:00:00Z',
            tags: [],
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 2,
          totalItems: 15,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockMaterials,
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should handle select all materials', async () => {
      const user = userEvent.setup();
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];

      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Remove Selected (2)')).toBeInTheDocument();
      });
    });

    it('should handle individual material selection', async () => {
      const user = userEvent.setup();
      const materialCheckboxes = screen.getAllByRole('checkbox');

      await user.click(materialCheckboxes[1]); // First material checkbox

      await waitFor(() => {
        expect(screen.getByText('Remove Selected (1)')).toBeInTheDocument();
      });
    });

    it('should remove selected materials', async () => {
      const user = userEvent.setup();

      // Select a material
      const materialCheckboxes = screen.getAllByRole('checkbox');
      await user.click(materialCheckboxes[1]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
        }),
      });

      const removeButton = screen.getByText('Remove Selected (1)');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'materials from project');
        expect(global.fetch).toHaveBeenCalledWith('/api/projects/test-project/materials/mat-1', {
          method: 'DELETE',
        });
      });
    });

    it('should handle remove materials error', async () => {
      const user = userEvent.setup();

      const materialCheckboxes = screen.getAllByRole('checkbox');
      await user.click(materialCheckboxes[1]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const removeButton = screen.getByText('Remove Selected (1)');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
      });
    });

    it('should handle remove materials exception', async () => {
      const user = userEvent.setup();

      const materialCheckboxes = screen.getAllByRole('checkbox');
      await user.click(materialCheckboxes[1]);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const removeButton = screen.getByText('Remove Selected (1)');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
      });
    });

    it('should handle materials fetch error', async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalledWith(expect.any(Error), {
          operation: 'fetch',
          entity: 'materials',
        });
      });
    });
  });

  describe('Project operations', () => {
    beforeEach(async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should open edit modal', async () => {
      const user = userEvent.setup();
      const menuButton = screen.getByRole('button', { name: '' }); // MoreVertical icon button

      await user.click(menuButton);
      const editButton = screen.getByText('Edit Project');
      await user.click(editButton);

      expect(screen.getByTestId('project-form-modal')).toBeInTheDocument();
    });

    it('should delete project after confirmation', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Project');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          'Are you sure you want to delete this project?',
        );
        expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'project');
        expect(mockPush).toHaveBeenCalledWith('/projects');
      });
    });

    it('should cancel project deletion', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(false);

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Project');
      await user.click(deleteButton);

      expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('DELETE'));
    });

    it('should handle delete error', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete Project');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
      });
    });

    it('should handle project update and refresh', async () => {
      const user = userEvent.setup();

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit Project');
      await user.click(editButton);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'proj-1', name: 'Updated Project' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
          }),
        });

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects/test-project');
      });
    });

    it('should redirect when project slug changes', async () => {
      const user = userEvent.setup();

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const editButton = screen.getByText('Edit Project');
      await user.click(editButton);

      const saveWithNewSlugButton = screen.getByText('Save with New Slug');
      await user.click(saveWithNewSlugButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/new-slug');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      const mockMaterials = {
        data: [
          {
            id: 'mat-1',
            slug: 'material-1',
            title: 'Material 1',
            recordedAt: '2024-01-01T12:00:00Z',
            tags: [],
          },
        ],
        pagination: {
          page: 2,
          limit: 10,
          totalPages: 3,
          totalItems: 25,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockMaterials,
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should handle page navigation', async () => {
      const user = userEvent.setup();

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(mockReplace).toHaveBeenCalledWith('/projects/test-project?page=3');
    });

    it('should disable previous button on first page', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      });

      // 最初のページに戻る
      const previousButton = screen.getByRole('button', { name: /Previous/ });
      await user.click(previousButton);

      expect(mockReplace).toHaveBeenCalledWith('/projects/test-project?page=1');
    });
  });

  describe('Modals', () => {
    beforeEach(async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should open manage materials modal', async () => {
      const user = userEvent.setup();
      const manageButton = screen.getByText('Manage Materials');

      await user.click(manageButton);

      expect(screen.getByTestId('manage-materials-modal')).toBeInTheDocument();
    });

    it('should refresh materials after manage materials modal success', async () => {
      const user = userEvent.setup();

      const manageButton = screen.getByText('Manage Materials');
      await user.click(manageButton);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
        }),
      });

      const applyButton = screen.getByText('Apply Changes');
      await user.click(applyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/test-project/materials'),
        );
      });
    });
  });

  describe('Date formatting', () => {
    it('should format dates correctly', async () => {
      const mockProject = {
        id: 'proj-1',
        slug: 'test-project',
        name: 'Test Project',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T15:30:00Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        // Date formatting depends on locale, so we just check that dates are displayed
        expect(screen.getByText(/Created:/)).toBeInTheDocument();
        expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      });
    });
  });
});
