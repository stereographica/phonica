import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageMaterialsModal } from '../ManageMaterialsModal';
import { useNotification } from '@/hooks/use-notification';

// Mock the notification hook
jest.mock('@/hooks/use-notification');

// Mock fetch
global.fetch = jest.fn();

const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();

const mockMaterials = [
  {
    id: '1',
    slug: 'material-1',
    title: 'Forest Recording',
    recordedAt: '2024-01-01T00:00:00Z',
    tags: [{ id: 't1', name: 'nature', slug: 'nature' }],
    isInProject: true,
  },
  {
    id: '2',
    slug: 'material-2',
    title: 'City Ambience',
    recordedAt: '2024-01-02T00:00:00Z',
    tags: [{ id: 't2', name: 'urban', slug: 'urban' }],
    isInProject: false,
  },
];

const mockTags = [
  { id: 't1', name: 'nature', slug: 'nature' },
  { id: 't2', name: 'urban', slug: 'urban' },
  { id: 't3', name: 'water', slug: 'water' },
];

describe('ManageMaterialsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNotification as jest.Mock).mockReturnValue({
      notifyError: mockNotifyError,
      notifySuccess: mockNotifySuccess,
    });
  });

  it('should render and show loading state initially', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    expect(screen.getByText('Manage Project Materials')).toBeInTheDocument();
    expect(screen.getByText('Loading materials...')).toBeInTheDocument();
  });

  it('should fetch materials and tags when opened', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/materials?')
      );
      expect(fetch).toHaveBeenCalledWith('/api/tags');
    });

    await waitFor(() => {
      expect(screen.getByText('Forest Recording')).toBeInTheDocument();
      expect(screen.getByText('City Ambience')).toBeInTheDocument();
    });
  });

  it('should show materials already in project as checked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is select all, then individual materials
      expect(checkboxes[1]).toBeChecked(); // Forest Recording (isInProject: true)
      expect(checkboxes[2]).not.toBeChecked(); // City Ambience (isInProject: false)
    });
  });

  it('should handle material selection and show changes', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    const user = userEvent.setup();
    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('City Ambience')).toBeInTheDocument();
    });

    // Select City Ambience
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[2]);

    await waitFor(() => {
      expect(screen.getByText(/1 to add/)).toBeInTheDocument();
    });

    // Deselect Forest Recording
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/1 to add/)).toBeInTheDocument();
      expect(screen.getByText(/1 to remove/)).toBeInTheDocument();
    });
  });

  it('should handle search functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    const user = userEvent.setup();
    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Forest Recording')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search materials by title...');
    await user.type(searchInput, 'Forest');

    // Wait for debounce
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('title=Forest')
      );
    }, { timeout: 1000 });
  });

  it('should handle batch update', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const user = userEvent.setup();
    const onSuccess = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={onOpenChange}
        projectSlug="test-project"
        onSuccess={onSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('City Ambience')).toBeInTheDocument();
    });

    // Select City Ambience
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[2]);

    const applyButton = screen.getByText('Apply Changes');
    await user.click(applyButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/projects/test-project/materials/batch-update',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            add: ['2'],
            remove: [],
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockNotifySuccess).toHaveBeenCalledWith(
        'update',
        'materials (1 added, 0 removed)'
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should show confirmation dialog for large deletions', async () => {
    const mockManyMaterials = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      slug: `material-${i + 1}`,
      title: `Material ${i + 1}`,
      recordedAt: '2024-01-01T00:00:00Z',
      tags: [],
      isInProject: true,
    }));

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockManyMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 10 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Material 1')).toBeInTheDocument();
    });

    // Deselect all materials
    const clearButton = screen.getByText('Clear Selection');
    await user.click(clearButton);

    const applyButton = screen.getByText('Apply Changes');
    await user.click(applyButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'You are about to remove 10 materials from this project. Are you sure?'
    );

    confirmSpy.mockRestore();
  });

  it('should handle sort functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    const user = userEvent.setup();
    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Forest Recording')).toBeInTheDocument();
    });

    // Click sort dropdown
    const sortButton = screen.getByText(/Recorded Date \(Newest First\)/);
    await user.click(sortButton);

    // Select different sort option
    const titleSort = screen.getByText('Title (A-Z)');
    await user.click(titleSort);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=title&sortOrder=asc')
      );
    });
  });

  it('should handle tag filter', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMaterials,
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

    const user = userEvent.setup();
    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={jest.fn()}
        projectSlug="test-project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Forest Recording')).toBeInTheDocument();
    });

    // Click tag filter dropdown
    const tagButton = screen.getByText('All Tags');
    await user.click(tagButton);

    // Select a tag
    const natureTag = screen.getByRole('menuitem', { name: 'nature' });
    await user.click(natureTag);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tag=nature')
      );
    });
  });
});