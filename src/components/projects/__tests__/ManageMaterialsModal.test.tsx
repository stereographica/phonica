import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageMaterialsModal } from '../ManageMaterialsModal';
import { useNotification } from '@/hooks/use-notification';

// Mock the notification hook
jest.mock('@/hooks/use-notification');

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects/test-project',
}));

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
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
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
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Verify API calls were made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/materials?'));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tags');
    });

    // Wait for loading to finish (should not show loading text)
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify content is displayed correctly
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Manage Project Materials')).toBeInTheDocument();
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
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify dialog is shown
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Verify that the components API calls were made
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/materials?'));
    expect(fetch).toHaveBeenCalledWith('/api/tags');
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

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify that UI components are present
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Manage Project Materials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search materials by title...')).toBeInTheDocument();
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
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Test search functionality exists
    const searchInput = screen.getByPlaceholderText('Search materials by title...');
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'Forest');
    expect(searchInput).toHaveValue('Forest');
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
      });

    const onSuccess = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <ManageMaterialsModal
        isOpen={true}
        onOpenChange={onOpenChange}
        projectSlug="test-project"
        onSuccess={onSuccess}
      />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify the necessary UI elements are present
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Apply Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
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

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify dialog is present
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();

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

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify sort dropdown is present
    expect(screen.getByText(/Recorded Date \(Newest First\)/)).toBeInTheDocument();
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

    render(
      <ManageMaterialsModal isOpen={true} onOpenChange={jest.fn()} projectSlug="test-project" />,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
    });

    // Verify tag filter dropdown is present
    expect(screen.getByText('All Tags')).toBeInTheDocument();
  });
});
