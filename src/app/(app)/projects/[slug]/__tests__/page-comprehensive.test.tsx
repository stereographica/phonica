/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import ProjectDetailPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock components
jest.mock('@/components/projects/ProjectFormModal', () => ({
  ProjectFormModal: jest.fn(({ isOpen, onOpenChange, initialData, onSuccess }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="project-form-modal">
        <h2>{initialData ? 'Edit Project' : 'Create Project'}</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button
          onClick={() => {
            const updatedProject = { ...initialData, slug: 'updated-slug' };
            onSuccess(updatedProject);
          }}
          data-testid="save-with-new-slug"
        >
          Save with new slug
        </button>
        <button
          onClick={() => {
            onSuccess(initialData);
          }}
          data-testid="save-without-change"
        >
          Save without change
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
        <h2>Manage Materials for nature-sounds</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={onSuccess} data-testid="modal-success">
          Save
        </button>
      </div>
    );
  }),
}));

// Mock DropdownMenu components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="dropdown-trigger">{children}</div>;
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button data-testid="dropdown-menu-item" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// Mock hooks
const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();

jest.mock('@/hooks/use-notification', () => ({
  useNotification: () => ({
    notifyError: mockNotifyError,
    notifySuccess: mockNotifySuccess,
    notifyInfo: jest.fn(),
    notifyWarning: jest.fn(),
  }),
}));

// Mock data
const mockProject = {
  id: 'proj-1',
  slug: 'nature-sounds',
  name: 'Nature Sounds Collection',
  description: 'A collection of natural ambient sounds',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-20T10:00:00Z',
};

const mockMaterials = [
  {
    id: 'mat-1',
    slug: 'forest-recording',
    title: 'Forest Recording',
    recordedAt: '2024-01-15T10:00:00Z',
    tags: [{ id: 't1', name: 'Nature', slug: 'nature' }],
  },
  {
    id: 'mat-2',
    slug: 'river-sounds',
    title: 'River Sounds',
    recordedAt: '2024-01-16T10:00:00Z',
    tags: [
      { id: 't1', name: 'Nature', slug: 'nature' },
      { id: 't2', name: 'Water', slug: 'water' },
    ],
  },
];

describe('ProjectDetailPage - Comprehensive Tests', () => {
  let mockPush: jest.Mock;
  let mockReplace: jest.Mock;
  const user = userEvent.setup();

  // console.errorを抑制
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    mockPush = jest.fn();
    mockReplace = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    (useParams as jest.Mock).mockReturnValue({ slug: 'nature-sounds' });
    (usePathname as jest.Mock).mockReturnValue('/projects/nature-sounds');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    global.fetch = jest.fn();

    jest.clearAllMocks();
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();
  });

  describe('Basic Display and Loading', () => {
    it('should display loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<ProjectDetailPage />);

      expect(screen.getByText('Loading project...')).toBeInTheDocument();
    });

    it('should display project details and materials', async () => {
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
            data: mockMaterials,
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 2,
            },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      expect(screen.getByText('A collection of natural ambient sounds')).toBeInTheDocument();
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
        expect(screen.getByText('River Sounds')).toBeInTheDocument();
      });

      expect(screen.getByText('Materials (2)')).toBeInTheDocument();
    });

    it('should display error when project not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument();
      });

      expect(mockNotifyError).toHaveBeenCalled();
      expect(screen.getByRole('link', { name: /Back to Projects/i })).toBeInTheDocument();
    });

    it('should handle fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(mockNotifyError).toHaveBeenCalled();
    });

    it('should display empty state when no materials', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 0,
              totalItems: 0,
            },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('No materials in this project yet')).toBeInTheDocument();
      });
    });

    it('should handle no project slug', async () => {
      (useParams as jest.Mock).mockReturnValue({ slug: '' });

      render(<ProjectDetailPage />);

      // fetchProject should not be called
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Edit Project', () => {
    it('should open edit modal when edit button is clicked', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTestId('dropdown-menu-item');
      const editButton = editButtons.find((btn) => btn.textContent?.includes('Edit Project'));

      if (editButton) {
        await user.click(editButton);
      }

      expect(screen.getByTestId('project-form-modal')).toBeInTheDocument();
      // モーダル内の「Edit Project」テキストを確認
      const modal = screen.getByTestId('project-form-modal');
      expect(modal).toHaveTextContent('Edit Project');
    });

    it('should redirect when project slug is updated', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTestId('dropdown-menu-item');
      const editButton = editButtons.find((btn) => btn.textContent?.includes('Edit Project'));

      if (editButton) {
        await user.click(editButton);
      }

      const saveWithNewSlugButton = screen.getByTestId('save-with-new-slug');
      await user.click(saveWithNewSlugButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/updated-slug');
    });

    it('should refresh project when updated without slug change', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockProject, name: 'Updated Name' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTestId('dropdown-menu-item');
      const editButton = editButtons.find((btn) => btn.textContent?.includes('Edit Project'));

      if (editButton) {
        await user.click(editButton);
      }

      const saveButton = screen.getByTestId('save-without-change');
      await user.click(saveButton);

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Delete Project', () => {
    it('should delete project when confirmed', async () => {
      global.confirm = jest.fn(() => true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const deleteButton = deleteButtons.find((btn) => btn.textContent?.includes('Delete Project'));

      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this project?');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/projects/nature-sounds', {
          method: 'DELETE',
        });
        expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'project');
        expect(mockPush).toHaveBeenCalledWith('/projects');
      });
    });

    it('should not delete project when cancelled', async () => {
      global.confirm = jest.fn(() => false);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const deleteButton = deleteButtons.find((btn) => btn.textContent?.includes('Delete Project'));

      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(global.confirm).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(2); // Only initial fetches
    });

    it('should handle delete error', async () => {
      global.confirm = jest.fn(() => true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const deleteButton = deleteButtons.find((btn) => btn.textContent?.includes('Delete Project'));

      if (deleteButton) {
        await user.click(deleteButton);
      }

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
      });
    });
  });

  describe('Material Selection and Removal', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });
    });

    it('should select individual materials', async () => {
      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstMaterialCheckbox = checkboxes[1]; // Skip select all checkbox

      await user.click(firstMaterialCheckbox);

      expect(screen.getByText('Remove Selected (1)')).toBeInTheDocument();
    });

    it('should select all materials when select all is checked', async () => {
      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      expect(screen.getByText('Remove Selected (2)')).toBeInTheDocument();
    });

    it('should deselect all materials when unchecking select all', async () => {
      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];

      // Check all
      await user.click(selectAllCheckbox);
      expect(screen.getByText('Remove Selected (2)')).toBeInTheDocument();

      // Uncheck all
      await user.click(selectAllCheckbox);
      expect(screen.queryByText(/Remove Selected/)).not.toBeInTheDocument();
    });

    it('should deselect individual materials', async () => {
      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstMaterialCheckbox = checkboxes[1]; // Skip select all checkbox

      // Select first
      await user.click(firstMaterialCheckbox);
      expect(screen.getByText('Remove Selected (1)')).toBeInTheDocument();

      // Deselect
      await user.click(firstMaterialCheckbox);
      expect(screen.queryByText(/Remove Selected/)).not.toBeInTheDocument();
    });

    it('should remove selected materials successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // DELETE request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [mockMaterials[1]], // Only second material remains
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Select first material
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Click remove button
      const removeButton = screen.getByRole('button', { name: /Remove Selected/ });
      await user.click(removeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/projects/nature-sounds/materials/mat-1', {
          method: 'DELETE',
        });
        expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'materials from project');
      });
    });

    it('should handle remove materials error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      });

      // Select first material
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Click remove button
      const removeButton = screen.getByRole('button', { name: /Remove Selected/ });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
      });
    });
  });

  describe('Manage Materials Modal', () => {
    it('should open manage materials modal', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Materials (2)')).toBeInTheDocument();
      });

      const manageMaterialsButton = screen.getByRole('button', { name: /Manage Materials/ });
      await user.click(manageMaterialsButton);

      expect(screen.getByTestId('manage-materials-modal')).toBeInTheDocument();
      expect(screen.getByText('Manage Materials for nature-sounds')).toBeInTheDocument();
    });

    it('should refresh materials after modal success', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              ...mockMaterials,
              {
                id: 'mat-3',
                slug: 'new-material',
                title: 'New Material',
                recordedAt: '2024-01-17T10:00:00Z',
                tags: [],
              },
            ],
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 3 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Materials (2)')).toBeInTheDocument();
      });

      const manageMaterialsButton = screen.getByRole('button', { name: /Manage Materials/ });
      await user.click(manageMaterialsButton);

      const modalSuccessButton = screen.getByTestId('modal-success');
      await user.click(modalSuccessButton);

      // Verify fetchProjectMaterials is called again
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when there are multiple pages', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 3,
              totalItems: 25,
            },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();
    });

    it('should navigate to next page', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 2,
              totalItems: 15,
            },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /Next/ });
      await user.click(nextButton);

      expect(mockReplace).toHaveBeenCalledWith('/projects/nature-sounds?page=2');
    });

    it('should respect URL parameters for pagination', async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams({ page: '2', limit: '20' }),
      );

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: {
              page: 2,
              limit: 20,
              totalPages: 3,
              totalItems: 50,
            },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('page=2&limit=20'));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle materials fetch error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockRejectedValueOnce(new Error('Materials fetch failed'));

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalledWith(expect.any(Error), {
          operation: 'fetch',
          entity: 'materials',
        });
      });
    });

    it('should show loading state for materials', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Loading materials...')).toBeInTheDocument();
      });
    });

    it('should handle non-ok response for materials fetch', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
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
        const [error] = mockNotifyError.mock.calls[0];
        expect(error.message).toBe('HTTP error! status: 500');
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly in Japanese locale', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockMaterials,
            pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
          }),
        });

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature Sounds Collection')).toBeInTheDocument();
      });

      // Check that date formatting is applied
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/2024/)).toBeInTheDocument(); // Year should be visible
    });
  });
});
